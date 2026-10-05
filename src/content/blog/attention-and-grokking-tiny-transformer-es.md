---
title: 'Atención y grokking: un transformer diminuto que aprende la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un transformer pequeño aprende suma modular. Memoriza los pares de entrenamiento en 750 pasos, espera 4.750 pasos más y entonces acierta pares que no vio nunca. El artículo construye el transformer y el motor en C#, dos veces: una escrito a mano y otra con un framework.'
lang: 'es'
pair: 'attention-and-grokking-tiny-transformer'
---

Dos resultados cambiaron el aprendizaje automático, y no tienen nada que ver entre sí.

En 2017, Vaswani y sus colegas publicaron [Attention Is All You Need](https://arxiv.org/abs/1706.03762). El artículo proponía el *transformer*: una red construida únicamente con *atención*, sin recurrencia y sin convoluciones. Esa arquitectura es la base de todos los modelos grandes que vinieron después, y lo que aporta es **estructura**: una forma de construir una red que lee una secuencia y mezcla información entre sus posiciones.

En 2022, Power y sus colegas describieron un resultado más pequeño y más extraño en [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). Entrenaron redes con conjuntos de datos algorítmicos pequeños y vieron que el modelo se aprendía de memoria todos los ejemplos que recibía mientras seguía respondiendo al azar los que no había visto. Aquello duró mucho más allá del punto de *sobreajuste*, ese momento en el que los ejemplos de entrenamiento ya salen perfectos y los nuevos siguen fallando. Y entonces el modelo cambió: de una medición a la siguiente empezó a acertar los ejemplos no vistos, y siguió acertándolos. Ese cambio es el *grokking*. El modelo memorizó primero y aprendió la regla después.

Este artículo reúne los dos resultados en un solo programa. El programa es un *transformer* de 56.640 parámetros que entrena con una única tarea aritmética. Después muestra el salto. Y está escrito dos veces, las dos en **C#**: una versión escribe el motor a mano y la otra se lo encarga a una biblioteca. Las dos dan el mismo salto.

## La tarea: suma modular

El módulo es **53**. El modelo lee una suma y debe devolver el resultado módulo 53, así que cada respuesta es un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

Esa regla es toda la tarea, y un modelo puede responderla de dos maneras:

- **Memorizar** los pares que vio durante el entrenamiento. Es fácil y rápido.
- **Aprender** la suma módulo 53. Cuesta más, pero responde todos los pares, incluidos los que no vio nunca.

El conjunto de datos contiene todos los pares, así que hay respuesta conocida para cada uno. Yo me quedo con el 30 % para entrenar y dejo el resto para probar. El conjunto de prueba es lo que permite distinguir una manera de la otra.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Número de pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares de prueba (70 %) | 1.966 |
| Vocabulario | 56 *tokens* |
| Longitud del documento | 6 *tokens* |
| Posiciones de predicción | 5 |
| Parámetros del modelo | 56.640 |
| Acierto por azar | 1,9 % |

El vocabulario es pequeño: los 53 números, más `+`, `=` y un *token* de inicio. Cada número es **un solo *token***, de modo que el modelo ve los operandos como unidades completas.

El documento es una sola secuencia, igual que una frase en un modelo de lenguaje. El modelo predice cada *token* siguiente, y solo la última predicción es la tarea:

| Posición | Token | Papel |
| ---: | :---: | --- |
| 1 | `[START]` | inicio del documento |
| 2 | `12` | primer operando |
| 3 | `+` | el operador |
| 4 | `35` | segundo operando |
| 5 | `=` | la entrada en la posición de la respuesta |
| 6 | `47` | **el objetivo**: el modelo debe predecir este *token* |

## El transformer

El modelo es el de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy, con las mismas simplificaciones: reescala cada vector antes de usarlo para que los números se mantengan en un rango estable (RMSNorm) y convierte los negativos en cero (ReLU). Tiene una capa, 64 dimensiones y 8 cabezas, es decir, la *atención* se ejecuta ocho veces en paralelo sobre ocho trozos del vector.

Para cada posición, el modelo construye un vector, y la capa hace dos cosas con él.

**La *atención* deja que las posiciones hablen entre sí.** El vector se convierte en otros tres: una consulta, una clave y un valor. La consulta de la posición actual se compara con las claves de todas las anteriores, y cada coincidencia se convierte en un peso. La salida es la suma ponderada de los valores:

```csharp
// una cabeza, en la posición pos, sobre las claves 0..=pos
for (int t = 0; t < nkeys; t++)
{
    double d = Dot(q, k[t]);              // cuánto encaja esta clave con la consulta
    scores[t] = d / Math.Sqrt(headDim);
}
double[] w = Softmax(scores);             // convierte las puntuaciones en pesos que suman 1
double[] salida = Weighted(w, v);         // una suma ponderada de los valores
```

El modelo construye una clave y un valor por cada posición que ya ha leído, y los guarda en una caché. Esa caché es la *caché KV* de los modelos de lenguaje grandes: lo que permite producir un *token* nuevo sin volver a calcular las claves y los valores de toda la conversación, y la razón de que un chat largo siga siendo rápido.

La caché también le impone al modelo su única regla sobre el futuro: la posición `t` puede mirar las posiciones `0` a `t` y ninguna más, porque la caché crece de *token* en *token*. Este motor la construye en cada pasada hacia delante, también durante el entrenamiento.

**El *MLP* piensa en una sola posición.** Proyecta el vector a cuatro veces su anchura, convierte los negativos en cero y lo proyecta de vuelta. La *atención* mueve información de unas posiciones a otras; el *MLP* la transforma dentro de una sola. Ambas partes suman su resultado a su entrada, así que la señal tiene un camino directo por la capa.

## Cómo aprende el modelo

En cada posición, el modelo produce una puntuación por cada *token* del vocabulario. En esta tarea son 56 puntuaciones: una por cada candidato a ser el siguiente. Una puntuación alta significa «espero este».

**La pérdida es un único número que dice cuánto se equivocó el modelo.** Solo mira una cosa: la probabilidad que el modelo le dio a la respuesta correcta.

| Probabilidad de la respuesta correcta | Pérdida |
| ---: | ---: |
| 100 % | 0,0 |
| 50 % | 0,7 |
| 10 % | 2,3 |
| 1 % | 4,6 |

Un modelo que está seguro y acierta saca 0,0. Uno que deja la respuesta correcta en una posibilidad entre cien saca 4,6, y saca lo mismo si estaba convencido de otra respuesta que si simplemente dudaba. La pérdida nunca baja de cero, así que la única forma de reducirla es darle más probabilidad a la respuesta correcta.

La regla tiene nombre: **entropía cruzada**. Es la forma estándar de puntuar a un modelo que devuelve una probabilidad por opción, y el número que el bucle de entrenamiento trata de reducir.

El motor calcula la pérdida en las cinco posiciones del documento y hace la media. Esa media es la cifra que aparece en las gráficas y en las columnas `loss` del CSV.

**Aprender consiste en cambiar los parámetros para que la pérdida baje.** Los 56.640 parámetros son los números que aprende el modelo. Para cada uno, el motor calcula cuánto mueve la pérdida y en qué dirección; ese número es el **gradiente**. Después mueve el parámetro un poco en la dirección contraria. Un conjunto de movimientos es un **paso de entrenamiento**, y el tamaño de cada movimiento lo decide una regla estándar llamada Adam.

**El decaimiento de pesos** (*weight decay*) **es una segunda fuerza, más pequeña.** En cada paso, el motor tira también un poco de cada parámetro hacia cero. De ahí salen dos cosas: la primera, que ningún parámetro crece sin límite; la segunda, que es la que importa aquí, que acaba ganando la respuesta más barata. Un modelo puede cuadrar los pares de entrenamiento guardándolos uno a uno, y para eso necesita parámetros grandes; uno que aprende la regla necesita menos. El decaimiento de pesos abarata esa segunda opción a medida que pasan los pasos, y de ahí sale el salto de la sección siguiente.

## El motor

Tres ideas mantienen pequeño el motor de entrenamiento.

**1. Cada valor del cálculo es un nodo dentro de una sola lista.**

Un nodo es una entrada de esa lista. Guarda cuatro cosas:

- **valor**: el número en sí.
- **gradiente**: cuánto mueve este número la pérdida. La pasada hacia atrás lo rellena después.
- **entradas**: los nodos a partir de los cuales se calculó este valor.
- **derivada local**: cuánto cambia el valor cuando cambia cada entrada.

Tomemos `y = a * b`. El motor añade un nodo con el valor `a * b`, las entradas `a` y `b` y las dos derivadas locales `b` y `a`. Nada se convierte en un objeto aparte, la lista se reutiliza en cada paso y la memoria se mantiene plana.

**2. El gradiente viaja hacia atrás por esa misma lista.**

Un nodo siempre se crea después de aquellos a partir de los cuales se calculó, así que la pasada hacia atrás recorre la lista del final al principio. Cuando llega a un nodo, todos los que dependen de él ya le han pasado su gradiente, y el gradiente de ese nodo está completo. Una sola pasada, sin recursión y sin ordenar nada.

**3. Un producto matriz-vector se convierte en un nodo por fila.**

Una fila de la matriz calcula un número: la suma de cada peso multiplicado por su entrada. El motor escribe toda esa suma en un solo nodo.

```csharp
double y = 0;
for (int k = 0; k < len; k++) y += w[k] * x[k];
```

Hacerlo de la forma directa daría un nodo por multiplicación y otro más por suma, así que una capa de 256 x 64 necesitaría 32.000 nodos. Con un nodo por fila necesita 256.

La pasada hacia atrás necesita dos cosas de esa fila: cuánto debe cambiar cada peso y cuánto debe cambiar cada entrada. Una multiplicación da las dos. Supongamos que la fila se pasó en `g`. Un peso que se multiplicó por una entrada grande tiene más culpa que uno que se multiplicó por una entrada pequeña, así que cada peso se lleva una parte de `g` proporcional a su entrada, y cada entrada se lleva una parte proporcional al peso que la usó:

```csharp
for (int k = 0; k < len; k++) gradW[k] += g * x[k];
for (int k = 0; k < len; k++) gradX[k] += g * w[k];
```

Los pesos de una fila están unos junto a otros en la lista, así que los dos bucles recorren dos bloques de números consecutivos. Ahí es donde entra SIMD: el motor ejecuta una operación aritmética sobre varios números a la vez, con AVX2 y FMA cuando el procesador los tiene.

## El acantilado

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto en entrenamiento llega al 100 % en el paso 750, mientras el de pares no vistos está en el 1,2 %. El acierto en pares no vistos se queda por debajo del 26 % hasta el paso 5.000, sube al 70 % en el paso 5.500 y llega al 96 % en el paso 10.000.](/blog/grokking-cliff.svg)

La línea azul es el conjunto de entrenamiento. La línea roja es el conjunto de prueba.

El acierto en entrenamiento llega al **100 % en el paso 750**: el modelo ya responde todos los pares que ha visto. El acierto en prueba está en el **1,2 %**, por debajo del 1,9 % que se saca adivinando al azar. El modelo ha memorizado.

A partir de ahí la línea roja se queda baja 4.750 pasos más: no pasa del 9 % hasta el paso 4.000 ni del 26 % hasta el 5.000. En el **paso 5.500** llega al **70 %** y en el 6.000 alcanza el **91 %**. Desde ese punto el modelo acierta **1.891 de los 1.966 pares no vistos**, y sigue acertándolos.

La parte plana de la gráfica es la interesante. El modelo no está atascado. Está ocupado.

## Qué ocurre por debajo

Otros dos números explican qué hace el modelo durante esa parte plana.

![Entropía cruzada frente al paso de entrenamiento, en escala logarítmica. La pérdida de entrenamiento toca suelo en el paso 750, mientras la de prueba se queda plana en 3,9 hasta el paso 4.000 y después baja a 2,0.](/blog/grokking-loss.svg)

La pérdida de entrenamiento cae deprisa y toca suelo. La de prueba no se mueve en miles de pasos; un modelo que solo hubiera memorizado mantendría esa forma para siempre. Aquí la pérdida de prueba empieza a caer, y esa caída es la regla que llega. El eje vertical está en escala logarítmica, así que bajar de 3,9 a 2,0 es dividir por dos, y el último decimal importa más de lo que parece: la pérdida de un modelo que responde bien ya está cerca del suelo.

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros sube de 19,2 a 21,8 mientras el modelo memoriza, y después baja a 15,2. En el eje derecho el acierto en pares no vistos se queda cerca del 1 % hasta el paso 4.000 y después sube al 96 %.](/blog/grokking-norm.svg)

Esta figura tiene **dos ejes**, uno por curva. La línea azul usa el eje izquierdo: el tamaño de los parámetros, de 19 a 22. Es un solo número para todo el modelo, y crece cuando crece cualquier parámetro. La línea roja usa el eje derecho: el acierto en pares que el modelo no ha visto nunca, del 0 % al 100 %.

La línea azul sube primero: el modelo guarda 843 respuestas separadas, y una tabla de consulta exige parámetros grandes. Después baja, porque el decaimiento de pesos tira de los parámetros en cada paso y la tabla se vuelve la opción cara. La línea roja va detrás: la respuesta pequeña y estructurada que suma números módulo 53 necesita menos, y en cuanto sale más barata que la tabla, el acierto en pares no vistos da el salto.

Las tres curvas juntas muestran todo el mecanismo: acierto en entrenamiento, acierto en pares no vistos y tamaño de los parámetros.

## El control

Quita el decaimiento y el modelo no aprende la regla. Memoriza, y eso es todo lo que hace:

| paso | decaimiento | acierto en entrenamiento | acierto en no vistos | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 750 | sí | 100 % | 1,2 % | 20,7 |
| 750 | no | 100 % | 0,7 % | 48,4 |
| 6.000 | sí | 100 % | 90,9 % | 15,9 |
| 6.000 | no | 100 % | 2,2 % | 100,9 |
| 12.000 | sí | 100 % | **96,2 %** | 15,2 |
| 12.000 | no | 93,6 % | **1,6 %** | 135,5 |
| 40.000 | no | 100 % | **3,3 %** | 245,2 |

Compara la última fila con la de arriba. Tres veces los pasos de la corrida que aprendió la regla, y el acierto en pares no vistos ha trepado del 1,6 % al 3,3 %: poco más que el 1,9 % que se saca adivinando, y todavía **65 de los 1.966 pares**. Esperar no sirve de nada. El modelo no es un aprendiz lento al que le falte tiempo; encontró la tabla y no tiene ninguna razón para dejarla.

Un acierto por debajo del azar es la firma de eso. Un modelo que ha memorizado no duda de los pares que no guardó: está convencido de ellos y se equivoca. El tamaño de los parámetros dice lo mismo, porque crece sin freno hasta dieciséis veces el del modelo que aprendió la regla: nada en la corrida lo está cobrando.

El decaimiento no es un detalle de la receta que da la casualidad de funcionar. Es la única fuerza de la corrida que abarata la respuesta que generaliza frente a la tabla, y sin él la regla no llega nunca.

## Reprodúcelo

Hace falta el SDK de .NET 10 o superior, y nada más. La primera compilación descarga la biblioteca nativa, que son unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-csharp
cd grokking-csharp
dotnet run -c Release
```

La ejecución tarda unos diez minutos en un núcleo de un portátil normal, y escribe tres cosas:

| Dónde | Qué |
| --- | --- |
| `data/train.txt`, `data/test.txt` | los dos conjuntos, un par por línea: 843 líneas y 1.966 líneas |
| `runs/grokking.csv` | los números registrados en cada paso |
| `figures/` | las tres gráficas de este artículo |

Los dos ficheros de texto son los pares en crudo, con la misma forma con la que los lee el modelo. Están para leerlos y contarlos: el entrenamiento usa esos mismos pares desde memoria. El repositorio guarda una copia de cada uno.

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

Algunos experimentos cambian el resultado de forma útil:

```bash
# control: sin decaimiento de pesos, así que nada saca al modelo de la solución que memoriza
dotnet run -c Release -- --wd 0

# un módulo más pequeño aprende antes y muestra la misma forma
dotnet run -c Release -- --p 13 --steps 3000

# una ejecución más larga, con registro más fino
dotnet run -c Release -- --steps 40000 --eval-every 100
```

## Inferencia

El entrenamiento puede guardar los parámetros, y la misma arquitectura los vuelve a cargar. El fichero `model.txt` no forma parte del repositorio: lo escribe la opción `--save` al final de una ejecución.

```bash
dotnet run -c Release -- --save
dotnet run -c Release -- --load model.txt --infer 12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (92%), 36 (3%), 17 (2%)
```

La entrada es `[START, 12, +, 35, =]`. El modelo la lee y devuelve una probabilidad por cada una de las 53 respuestas posibles. La inferencia es una sola pasada hacia delante: sin gradiente y sin pasada hacia atrás. `--infer` imprime las tres respuestas más probables junto a su probabilidad.

## Lo mismo sin el motor

El motor de este artículo son 1.160 líneas, y la mayoría existen para calcular derivadas. Una biblioteca hace esa parte por ti. El mismo experimento, con el modelo escrito en **55 líneas** y el bucle de entrenamiento en **12**, está en [grokking-torchsharp](https://github.com/jacano/grokking-torchsharp), sobre [TorchSharp](https://github.com/dotnet/TorchSharp), el enlace de PyTorch para .NET.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
dotnet run -c Release
```

Esa versión tarda 26 segundos en vez de diez minutos, da el mismo salto en el paso 3.750 y termina en el **97,3 %**: 1.912 de los 1.966 pares no vistos. Su modelo, entero, es esto:

```csharp
public override Tensor forward(Tensor index)
{
    Tensor positions = arange(index.shape[1], dtype: ScalarType.Int64, device: index.device);
    Tensor x = _wte.forward(index) + _wpe.forward(positions);
    Tensor h = RmsNorm(x);
    Tensor q = _wq.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor k = _wk.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor v = _wv.forward(h).reshape(batch, length, _heads, _headDim).transpose(1, 2);
    Tensor attended = scaled_dot_product_attention(q, k, v, is_casual: true);
    x = x + _wo.forward(attended.transpose(1, 2).reshape(batch, length, _embd));
    x = x + _fc2.forward(relu(_fc1.forward(RmsNorm(x))));
    return _lmHead.forward(x);
}
```

La pasada hacia atrás y el optimizador se quedan en tres líneas más:

```csharp
loss.backward();
optimiser.step();
```

Lo que la biblioteca no te quita es el pensamiento. Sigue inicializando los vectores a la escala equivocada, y su `AdamW` no es el `Adam` de microgpt: ahí el decaimiento va fuera de la actualización en vez de dentro del gradiente. Con `AdamW` esa versión no saltó nunca, con ningún decaimiento entre 0,002 y 0,5. Con el decaimiento dentro del gradiente funciona el mismo `wd` que en el motor. Lee los dos repositorios en paralelo: uno enseña qué hace un *transformer*, y el otro, qué poco de él hay que escribir.

## Conclusiones

- **La *atención* mueve información de unas posiciones a otras; el *MLP* la transforma dentro de una sola.** Todo lo demás en el *transformer* es andamiaje alrededor de esas dos operaciones.
- **Un modelo puede cuadrar los datos sin aprender la regla.** El acierto en entrenamiento es una mala guía: llega al 100 % mientras el de pares no vistos sigue en el azar.
- **El *grokking* es una transición entre dos soluciones.** La que memoriza necesita pesos grandes; la que generaliza necesita menos. El decaimiento de pesos decide cuál sobrevive, y la decisión tarda miles de pasos.
- **Vigila tres números a la vez.** Acierto en entrenamiento, acierto en pares no vistos y tamaño de los parámetros. Una sola curva esconde el mecanismo.

El motor, el conjunto de datos, las gráficas y la ejecución en crudo están en dos repositorios: [grokking-csharp](https://github.com/jacano/grokking-csharp), con el motor escrito a mano, y [grokking-torchsharp](https://github.com/jacano/grokking-torchsharp), con el mismo experimento sobre una biblioteca. Cada figura de este artículo sale del CSV del primero.
