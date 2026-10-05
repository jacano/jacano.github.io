---
title: 'Atención y grokking: un transformer diminuto que aprende la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un transformer pequeño aprende suma modular. Memoriza los pares de entrenamiento en 600 pasos, espera 4.000 pasos más y entonces acierta pares que no vio nunca. El artículo construye el transformer y el motor en Rust que muestra el salto.'
lang: 'es'
pair: 'attention-and-grokking-tiny-transformer'
---

Dos resultados cambiaron el aprendizaje automático, y son de naturaleza distinta.

En 2017, Vaswani y sus colegas publicaron [Attention Is All You Need](https://arxiv.org/abs/1706.03762). El artículo proponía el transformer: una red construida solo con atención, sin recurrencia y sin convoluciones. Esa arquitectura se convirtió en la base de todos los modelos grandes que vinieron después, y el resultado va de **estructura**. Es una forma de construir una red que lee una secuencia y mezcla información entre sus posiciones.

En 2022, Power y sus colegas describieron un resultado más pequeño y más raro en [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). Entrenaron redes con conjuntos de datos algorítmicos pequeños y vieron que un modelo ajustaba todos los ejemplos que recibía mientras seguía adivinando en los ejemplos que no había visto. Las adivinanzas continuaron mucho más allá del punto de sobreajuste, ese momento en el que los ejemplos de entrenamiento ya salen perfectos y los nuevos siguen fallando. Entonces el modelo cambió: de una medición a la siguiente, empezó a responder bien los ejemplos no vistos, y siguió respondiéndolos bien. Ese cambio es el grokking. El modelo memorizó primero y aprendió la regla después.

Este artículo mete los dos resultados en un solo programa. El programa es un transformer de 56.640 parámetros. El motor son unas 1.200 líneas de Rust sin dependencias, y entrena con una única tarea aritmética. Después muestra el salto.

## La tarea: suma modular

El módulo es **53**. El modelo lee una suma y debe devolver el resultado módulo 53. Cada respuesta es un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

Esa regla es toda la tarea. Un modelo puede responderla de dos maneras:

- **Memorizar** los pares que vio durante el entrenamiento. Es fácil y rápido.
- **Aprender** la suma módulo 53. Es más lento, y responde todos los pares, incluidos los que el modelo no vio nunca.

El conjunto de datos contiene todos los pares, así que la tarea tiene respuesta conocida para todos. Yo me quedo con el 30 % para entrenar y dejo el resto para probar. El conjunto de prueba es la parte que separa las dos maneras.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Número de pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares de prueba (70 %) | 1.966 |
| Vocabulario | 56 tokens |
| Longitud del documento | 6 tokens |
| Posiciones de predicción | 5 |
| Parámetros del modelo | 56.640 |
| Acierto por azar | 1,9 % |

El vocabulario es pequeño: los 53 números, más `+`, `=` y un token de inicio. Cada número es **un token**, así que el modelo ve los operandos como unidades completas.

El documento es una sola secuencia, igual que una frase en un modelo de lenguaje. El modelo predice cada token siguiente, y solo la última predicción es la tarea:

| Posición | Token | Papel |
| ---: | :---: | --- |
| 1 | `[START]` | inicio del documento |
| 2 | `12` | primer operando |
| 3 | `+` | el operador |
| 4 | `35` | segundo operando |
| 5 | `=` | la entrada en la posición de la respuesta |
| 6 | `47` | **el objetivo**: el modelo debe predecir este token |

## El transformer

El modelo es el de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy, con las mismas simplificaciones. Reescala cada vector antes de usarlo, para que los números se queden en un rango estable (RMSNorm). Convierte los números negativos en cero (ReLU). Una capa, 64 dimensiones y 8 cabezas, lo que significa que la atención se ejecuta ocho veces en paralelo sobre ocho trozos del vector.

Para cada posición el modelo construye un vector. La capa hace dos cosas con él.

**La atención deja que las posiciones hablen entre sí.** El vector se convierte en otros tres: una consulta, una clave y un valor. La consulta de la posición actual se compara con las claves de todas las posiciones anteriores. Cada coincidencia se convierte en un peso. La salida es la suma ponderada de los valores:

```rust
// una cabeza, en la posición pos, sobre las claves 0..=pos
for t in 0..nkeys {
    let d = dot(q, k[t]);              // cuánto encaja esta clave con la consulta
    scores[t] = d / (head_dim as f64).sqrt();
}
let w = softmax(scores);               // convierte las puntuaciones en pesos que suman 1
let out = w * v;                       // una suma ponderada de los valores
```

El modelo construye una clave y un valor por cada posición que ya ha leído, y los guarda en una caché. Esa caché es la **KV cache** de los modelos de lenguaje grandes. Es lo que permite producir un token nuevo sin volver a calcular las claves y los valores de toda la conversación, y es la razón de que un chat largo siga siendo rápido.

La caché también le da al modelo su única regla sobre el futuro: la posición `t` puede mirar las posiciones `0` a `t`, y ninguna más, porque la caché crece de token en token. Este motor construye esa caché en cada pasada hacia delante, también durante el entrenamiento.

**El MLP piensa en una sola posición.** Proyecta el vector a cuatro veces su anchura, convierte los negativos en cero y lo proyecta de vuelta. La atención mueve información entre posiciones. El MLP transforma la información dentro de una posición. Las dos partes suman su resultado a su entrada, así que la señal tiene un camino directo por la capa.

## Cómo aprende el modelo

En cada posición el modelo produce una puntuación por cada token del vocabulario. Para esta tarea son 56 puntuaciones: una por cada candidato a ser el token siguiente. Una puntuación alta significa "espero este".

**La pérdida es un solo número que dice cuánto se equivocó el modelo.** Solo mira la probabilidad que el modelo dio a la respuesta correcta:

| Probabilidad | En palabras | Pérdida |
| ---: | :--- | ---: |
| 1,00 | seguro, y acierta | 0,0 |
| 0,50 | una moneda al aire | 0,7 |
| 0,10 | una posibilidad entre diez | 2,3 |
| 0,01 | una posibilidad entre cien | 4,6 |

Lee la tabla de arriba abajo. Cuando el modelo está seguro y acierta, la pérdida es cero. Cuando está seguro y falla, la pérdida es grande. La pérdida nunca baja de cero, así que la única forma de reducirla es darle más probabilidad a la respuesta correcta.

La regla tiene nombre: **entropía cruzada**. Es la forma estándar de puntuar un modelo que devuelve una probabilidad por opción, y es el número que el bucle de entrenamiento trabaja para reducir.

El motor calcula la pérdida en las cinco posiciones del documento y hace la media. Esa media es el número de las gráficas y de las columnas `loss` del CSV.

**Aprender significa cambiar los parámetros para que la pérdida sea menor.** Los 56.640 parámetros son los números que aprende el modelo. Para cada parámetro, el motor calcula cuánto mueve la pérdida y en qué dirección. Ese número es el **gradiente**. Después el motor mueve cada parámetro un poco en contra de su gradiente. Un conjunto de movimientos es un **paso de entrenamiento**. El motor usa una regla estándar llamada Adam para elegir el tamaño de cada movimiento.

**El weight decay es una segunda fuerza, más pequeña.** En cada paso el motor también tira de cada parámetro un poco hacia cero. De ahí salen dos cosas. La primera, que ningún parámetro puede crecer sin límite. La segunda, y es la que importa aquí, que gana la respuesta más barata. Un modelo puede ajustar los pares de entrenamiento guardándolos uno a uno, y eso necesita parámetros grandes. Un modelo que aprende la regla necesita menos. El weight decay abarata la segunda opción a medida que pasan los pasos, y eso es lo que produce el salto de la sección siguiente.

## El motor

Tres ideas mantienen pequeño el motor de entrenamiento.

**1. Cada valor del cálculo es un nodo dentro de una sola lista.**

Un nodo es una entrada de esa lista. Guarda cuatro cosas:

- **valor**: el número en sí.
- **gradiente**: cuánto mueve este número la pérdida. La pasada hacia atrás lo rellena después.
- **entradas**: los nodos a partir de los cuales se calculó este valor.
- **derivada local**: cuánto cambia el valor cuando cambia cada entrada.

Tomemos `y = a * b`. El motor añade un nodo: el valor `a * b`, las entradas `a` y `b`, y las dos derivadas locales `b` y `a`. Nada se convierte en un objeto aparte, la lista se reutiliza en cada paso y la memoria se mantiene plana.

**2. El gradiente viaja hacia atrás por esa misma lista.**

Un nodo siempre está después de los nodos a partir de los cuales se calculó. Así que la pasada hacia atrás lee la lista del final al principio. Cuando llega a un nodo, todos los nodos que dependen de él ya le han pasado su gradiente, y el gradiente de ese nodo está completo. Una pasada, sin recursión y sin ordenar nada.

**3. Un producto matriz-vector se convierte en un nodo por fila.**

Una fila de la matriz calcula un número: la suma de cada peso multiplicado por su entrada. El motor escribe toda esa suma en un solo nodo.

```rust
let mut y = 0.0;
for k in 0..len {
    y += w[k] * x[k];
}
```

La forma directa daría un nodo por multiplicación y otro más por suma, así que una capa de 256 x 64 necesitaría 32.000 nodos. Con un nodo por fila necesita 256.

La pasada hacia atrás necesita dos cosas de esa fila: cuánto debe cambiar cada peso y cuánto debe cambiar cada entrada. Una multiplicación da las dos. Supongamos que la fila salió demasiado alta por `g`. Un peso que se multiplicó por una entrada grande tiene más culpa que uno que se multiplicó por una entrada pequeña, así que cada peso se lleva una parte de `g` proporcional a su entrada, y cada entrada se lleva una parte proporcional al peso que la usó:

```rust
for k in 0..len {
    grad_w[k] += g * x[k];
    grad_x[k] += g * w[k];
}
```

Los pesos de una fila están unos junto a otros en la lista, así que los dos bucles recorren dos bloques de números consecutivos. Ahí es donde entra SIMD: el motor ejecuta una operación aritmética sobre varios números a la vez, con AVX2 y FMA cuando el procesador los tiene.

## El acantilado

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto de entrenamiento llega al 99 % en el paso 600, mientras el de pares no vistos está en el 1 %. El acierto en pares no vistos se queda por debajo del 12 % hasta el paso 4000, sube al 72 % en el paso 5000 y llega al 94 % en el paso 8000.](/blog/grokking-cliff.svg)

La línea azul es el conjunto de entrenamiento. La línea roja es el conjunto de prueba.

El acierto de entrenamiento llega al **99 % en el paso 600**. El modelo ya responde todos los pares que ha visto. El acierto de prueba está en el **1,0 %**, por debajo del 1,9 % de adivinar al azar. El modelo ha memorizado.

Después la línea roja se queda baja 4.000 pasos más. Solo pasa del 12 % en el paso 4.000. En el **paso 5.000** llega al **72 %**, y en el paso 6.000 alcanza el **92 %**. A partir de ahí el modelo responde **1.842 de los 1.966 pares no vistos**, y sigue respondiéndolos.

La parte plana de la gráfica es la interesante. El modelo no está atascado. Está ocupado.

## Qué pasa por debajo

Otros dos números explican qué hace el modelo durante esa parte plana.

![Entropía cruzada frente al paso de entrenamiento, en escala logarítmica. La pérdida de entrenamiento toca su suelo en el paso 600, mientras la de prueba se queda plana en 2,0 hasta el paso 4000 y después baja a 0,2.](/blog/grokking-loss.svg)

La pérdida de entrenamiento cae rápido y toca su suelo. La de prueba no se mueve en miles de pasos. Un modelo que solo hubiera memorizado mantendría esa forma para siempre. Aquí la pérdida de prueba empieza a caer, y esa caída es la regla que llega. El eje vertical está en escala logarítmica, así que la caída de 2,0 a 0,2 es un factor de diez.

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros sube de 19,2 a 21,9 mientras el modelo memoriza, y después baja a 15,3. En el eje derecho el acierto en pares no vistos se queda cerca del 1 % hasta el paso 4000 y después sube al 94 %.](/blog/grokking-norm.svg)

Esta figura tiene **dos ejes**, uno por curva. La línea azul usa el eje izquierdo: el tamaño de los parámetros, de 19 a 22. Es un solo número para todo el modelo, y crece cuando crece cualquier parámetro. La línea roja usa el eje derecho: el acierto en pares que el modelo no ha visto nunca, del 0 % al 100 %.

La línea azul sube primero. El modelo guarda 843 respuestas separadas, y una tabla de consulta necesita parámetros grandes. Después la línea azul baja: el weight decay tira de los parámetros en cada paso, así que la tabla se vuelve la opción cara. La línea roja va detrás. La respuesta pequeña y estructurada que suma números módulo 53 necesita menos, y cuando sale más barata que la tabla, el acierto en pares no vistos da el salto.

Las tres curvas juntas muestran todo el mecanismo: acierto de entrenamiento, acierto en pares no vistos y tamaño de los parámetros.

## Reprodúcelo

Necesitas Rust 1.75 o superior. No hay ninguna otra dependencia.

```bash
git clone https://github.com/jacano/grokking-rs
cd grokking-rs
cargo run --release
```

La ejecución tarda unos ocho minutos en un núcleo de un portátil normal. Escribe tres cosas:

| Dónde | Qué |
| --- | --- |
| `data/train.txt`, `data/test.txt` | los dos conjuntos, un par por línea: 843 líneas y 1.966 líneas |
| `runs/grokking.csv` | los números registrados en cada paso |
| `figures/` | las tres gráficas de este artículo |

Los dos ficheros de texto son los pares en crudo, con la misma forma en la que los lee el modelo. Son para leerlos y contarlos: el entrenamiento usa esos mismos pares desde memoria. El repositorio guarda una copia de cada uno.

Cada fila del CSV tiene seis columnas, así que puedes seguir el proceso desde cualquier herramienta:

| Columna | Significado |
| --- | --- |
| `step` | paso de entrenamiento |
| `train_loss` | entropía cruzada media sobre 512 pares de entrenamiento |
| `train_acc` | acierto exacto en esos pares |
| `test_loss` | entropía cruzada media sobre los 1.966 pares no vistos |
| `test_acc` | acierto exacto en los pares no vistos |
| `param_norm` | tamaño de todos los parámetros, como un solo número |

Para seguir el aprendizaje mientras ocurre:

```bash
# Linux y macOS
tail -f runs/grokking.csv

# Windows PowerShell
Get-Content runs/grokking.csv -Wait
```

Unos cuantos experimentos cambian el resultado de forma útil:

```bash
# control: sin weight decay, así que nada saca al modelo de la solución que memoriza
cargo run --release -- --wd 0

# un módulo más pequeño aprende antes y muestra la misma forma
cargo run --release -- --p 13 --steps 3000

# una ejecución más larga, con registro más fino
cargo run --release -- --steps 40000 --eval-every 100
```

## Inferencia

El entrenamiento puede guardar los parámetros, y la misma arquitectura los vuelve a cargar. El fichero `model.txt` no forma parte del repositorio: lo escribe el flag `--save` al final de una ejecución.

```bash
cargo run --release -- --save
cargo run --release -- --load model.txt --infer 12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (97%), 38 (1%), 3 (1%)
```

El prompt es `[START, 12, +, 35, =]`. El modelo lo lee y devuelve una probabilidad por cada una de las 53 respuestas posibles. La inferencia es una sola pasada hacia delante: sin gradiente y sin pasada hacia atrás. `--infer` imprime las tres respuestas más probables con su probabilidad.

## Qué llevarse

- **La atención mueve información entre posiciones; el MLP la transforma dentro de una.** El resto del transformer es fontanería alrededor de esas dos operaciones.
- **Un modelo puede ajustar los datos sin aprender la regla.** El acierto de entrenamiento es una mala guía: llega al 100 % mientras el de pares no vistos sigue en el azar.
- **El grokking es una transición entre dos soluciones.** La solución que memoriza necesita pesos grandes. La que generaliza necesita menos. El weight decay decide cuál sobrevive, y la decisión tarda miles de pasos.
- **Mira tres números a la vez.** Acierto de entrenamiento, acierto en pares no vistos y tamaño de los parámetros. Una sola curva esconde el mecanismo.

El motor, el conjunto de datos, las gráficas y la ejecución en crudo están en [github.com/jacano/grokking-rs](https://github.com/jacano/grokking-rs). El código son unas 1.200 líneas de Rust sin dependencias, y cada figura de este artículo sale del CSV de esa ejecución.
