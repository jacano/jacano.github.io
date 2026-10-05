---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un modelo memoriza 843 sumas, falla casi todas las que no ha visto durante tres mil pasos y entonces aprende a sumar. Ese salto es el grokking: el artículo lo hace ocurrir, mide qué lo provoca y enseña qué piensa el modelo antes y después.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Un modelo aprende a sumar dos números. Ve 843 sumas y, en el paso 1.000, acierta el 98 % sin fallar ninguna.

Entonces le das una suma que no ha visto nunca y la falla. Y no falla una: falla **1.942 de las 1.966** sumas que me había guardado, y acierta menos que el 1,9 % que sacaría adivinando, porque no duda de sí mismo. Está convencido y se equivoca.

Esperas. El acierto en entrenamiento se mantiene alto todo el rato, así que una lectura rápida diría que la corrida ha terminado, y el número que importa no se mueve durante otros tres mil pasos. Y entonces, de una medición a la siguiente, el modelo empieza a acertar las sumas que tenía guardadas. Cuatro mediciones después acierta casi todas.

Eso es el *grokking*, la comprensión que llega de golpe, y este artículo lo hace ocurrir: un *transformador* (*transformer*) de 56.640 parámetros, una tarea aritmética y una corrida de veintiséis segundos en un núcleo de portátil.

En el camino se cruzan dos artículos científicos.

En 2017, Vaswani y sus colegas publicaron [Attention Is All You Need](https://arxiv.org/abs/1706.03762). Proponían el *transformador*: una red construida únicamente con *atención*, sin recurrencia y sin convoluciones. Todos los modelos grandes que vinieron después descienden de esa estructura, y lo que aporta es **estructura**: una forma de leer una secuencia y mezclar información entre sus posiciones.

En 2022, Power y sus colegas describieron la sorpresa en [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177). Entrenaron redes pequeñas con conjuntos de datos algorítmicos pequeños y vieron que una de ellas se aprendía de memoria todos los ejemplos que recibía mientras fallaba los que no había visto. El fallo duró miles de pasos, mucho más allá del punto de *sobreajuste*. Y entonces paró. El nombre de ese salto viene de su artículo.

## La tarea: suma modular

El módulo es **53**. El modelo lee una suma y devuelve el resultado módulo 53, así que cada respuesta es un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

La regla cabe en una línea, y tiene una propiedad que hace que los siguientes 12.000 pasos merezcan la pena: **un modelo puede aprobar la tarea memorizando**. Nada le obliga a hacer la aritmética, y memorizar es la respuesta fácil al principio.

- **Memorizar** los pares que vio. Rápido, y solo responde esos.
- **Aprender** la suma módulo 53. Cuesta más, y responde todos los pares, incluidos los que no vio nunca.

El conjunto de datos contiene todos los pares, así que hay respuesta conocida para cada uno. Yo me quedo con el 30 % para entrenar y guardo el resto. Esos pares sin ver son lo único que separa una respuesta de la otra.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Número de pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares de prueba (70 %) | 1.966 |
| Vocabulario | 56 *símbolos* (*tokens*) |
| Longitud del documento | 6 *símbolos* |
| Posiciones de predicción | 5 |
| Parámetros del modelo | 56.640 |
| Acierto por azar | 1,9 % |

El vocabulario es pequeño: los 53 números, más `+`, `=` y un *símbolo* de inicio. Cada número es **un solo *símbolo***, de modo que el modelo ve los operandos como unidades completas.

El documento es una sola secuencia, igual que una frase en un modelo de lenguaje. El modelo predice cada *símbolo* siguiente, y solo la última predicción es la tarea:

| Posición | Símbolo | Papel |
| ---: | :---: | --- |
| 1 | `[START]` | inicio del documento |
| 2 | `12` | primer operando |
| 3 | `+` | el operador |
| 4 | `35` | segundo operando |
| 5 | `=` | la entrada en la posición de la respuesta |
| 6 | `47` | **el objetivo**: el modelo debe predecir este *símbolo* |

Ahora viene lo interesante: la corrida.

## El acantilado

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto en entrenamiento llega al 98 % en el paso 1.000, mientras el de pares no vistos está en el 1,2 %. El acierto en pares no vistos sube del 13 % en el paso 3.000 al 74 % en el 3.750 y llega al 97 % en el 5.000.](/blog/grokking-cliff.svg)

La línea azul es el conjunto de entrenamiento. La línea roja es el conjunto que me guardé.

El acierto en entrenamiento llega al **98 % en el paso 1.000**, y ya no vuelve a caer muy por debajo de ahí. El modelo responde casi todos los pares que ha visto, y el acierto en los que no ha visto está en el **1,2 %**, por debajo del 1,9 % que se saca adivinando. Ha memorizado 843 sumas y no ha aprendido nada.

Después la línea roja se queda plana otros dos mil pasos. No pasa del 13 % hasta el paso 3.000 ni del 28 % hasta el 3.500. En el **paso 3.750** llega al **74 %**, y en el 5.000 alcanza el **92 %**. Desde ahí el modelo acierta **1.912 de los 1.966 pares que no había visto**, y sigue acertándolos.

La parte plana de esa gráfica es la que hay que explicar. El modelo no está atascado. Está ocupado.

Dos imágenes dicen qué cambia. Esto es lo que el modelo piensa de `12 + 35`, una suma que no vio nunca, en el momento en que ya se lo ha aprendido todo de memoria y ha dejado de mejorar:

![Gráfica de barras con las 53 respuestas que el modelo considera para 12 + 35, tras 1.000 pasos. La respuesta correcta, 47, tiene una barra del 0,3 %, y la barra más alta, la de la respuesta 6, llega al 40 %.](/blog/grokking-probs-early.svg)

Y esta es la misma suma después de que llegue la regla:

![La misma gráfica tras 12.000 pasos. La barra de la respuesta correcta, 47, llega al 90 %, y todas las demás están cerca de cero.](/blog/grokking-probs-late.svg)

El modelo no duda nunca. Elige una respuesta y la defiende, y por eso es posible un acierto por debajo del 1,9 % que se saca adivinando. Lo que cambia en el paso 3.750 no es la confianza: es a dónde va esa confianza.

Hay dos cosas que la explican: qué es el modelo y qué lo empuja. Empecemos por el modelo.

## El modelo

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

El modelo construye una clave y un valor por cada posición que ya ha leído, y esos vectores son la *caché de claves y valores* (*KV cache*) de los modelos de lenguaje grandes: lo que permite producir un *símbolo* nuevo sin volver a calcular las claves y los valores de toda la conversación, y la razón de que un chat largo siga siendo rápido. La biblioteca te mantiene esa caché: calcula de una vez las claves y los valores de todo el documento y enmascara el futuro, que es la misma idea hecha en paralelo.

**El *perceptrón* (*MLP*) piensa en una sola posición.** Proyecta el vector a cuatro veces su anchura, convierte los negativos en cero y lo proyecta de vuelta. La *atención* mueve información de unas posiciones a otras; el *perceptrón* la transforma dentro de una sola. Ambas partes suman su resultado a su entrada, así que la señal tiene un camino directo por la capa.

Ese es todo el modelo, y con una biblioteca cabe en un método. Esto es entero:

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

## Cómo aprende el modelo

En cada posición, el modelo produce una puntuación por cada *símbolo* del vocabulario. En esta tarea son 56 puntuaciones: una por cada candidato a ser el siguiente. Una puntuación alta significa «espero este».

**La pérdida es un único número que dice cuánto se equivocó el modelo.** Solo mira una cosa: la probabilidad que el modelo le dio a la respuesta correcta.

| Probabilidad de la respuesta correcta | Pérdida |
| ---: | ---: |
| 100 % | 0,0 |
| 50 % | 0,7 |
| 10 % | 2,3 |
| 1 % | 4,6 |

Un modelo que está seguro y acierta saca 0,0. Uno que deja la respuesta correcta en una posibilidad entre cien saca 4,6, y saca lo mismo si estaba convencido de otra respuesta que si simplemente dudaba. La pérdida nunca baja de cero, así que la única forma de reducirla es darle más probabilidad a la respuesta correcta.

La regla tiene nombre: **entropía cruzada**. Es la forma estándar de puntuar a un modelo que devuelve una probabilidad por opción, y el número que el bucle de entrenamiento trata de reducir.

El modelo calcula la pérdida en las cinco posiciones del documento y hace la media. Esa media es la cifra que aparece en las gráficas y en las columnas `loss` del CSV.

**Aprender consiste en cambiar los parámetros para que la pérdida baje.** Los 56.640 parámetros son los números que aprende el modelo. Para cada uno, la biblioteca calcula cuánto mueve la pérdida y en qué dirección; ese número es el **gradiente**. Después mueve el parámetro un poco en la dirección contraria. Un conjunto de movimientos es un **paso de entrenamiento**, y el tamaño de cada movimiento lo decide un optimizador. Esta corrida usa uno llamado Adam.

**El decaimiento de pesos** (*weight decay*) **es una segunda fuerza, más pequeña.** En cada paso, el optimizador tira también un poco de cada parámetro hacia cero. De ahí salen dos cosas: la primera, que ningún parámetro crece sin límite; la segunda, que es la que importa aquí, que acaba ganando la respuesta más barata. Un modelo puede cuadrar los pares de entrenamiento guardándolos uno a uno, y para eso necesita parámetros grandes; uno que aprende la regla necesita menos. El decaimiento de pesos abarata esa segunda opción a medida que pasan los pasos, y de ahí sale el salto.

## Lo que la biblioteca hace por ti

El modelo son 55 líneas y el bucle de entrenamiento 12. Todo lo demás en una corrida así es la diferenciación automática, y esa es la parte que TorchSharp escribe en tu lugar. Son tres ideas.

**1. Cada valor del cálculo es un nodo dentro de una sola lista.**

Un nodo guarda cuatro cosas:

- **valor**: el número en sí.
- **gradiente**: cuánto mueve este número la pérdida. La pasada hacia atrás lo rellena después.
- **entradas**: los nodos a partir de los cuales se calculó este valor.
- **derivada local**: cuánto cambia el valor cuando cambia cada entrada.

Tomemos `y = a * b`. Un nodo: el valor `a * b`, las entradas `a` y `b` y las dos derivadas locales `b` y `a`. Nada se convierte en un objeto aparte, la lista se reutiliza en cada paso y la memoria se mantiene plana.

**2. El gradiente viaja hacia atrás por esa misma lista.**

Un nodo siempre se crea después de aquellos a partir de los cuales se calculó, así que la pasada hacia atrás recorre la lista del final al principio. Cuando llega a un nodo, todos los que dependen de él ya le han pasado su gradiente, y el gradiente de ese nodo está completo. Una sola pasada, sin recursión y sin ordenar nada.

**3. Un producto de matrices no son mil nodos pequeños.**

Una fila de una matriz de pesos calcula un número: la suma de cada peso multiplicado por su entrada. La biblioteca guarda toda esa suma en un solo nodo, y escribe a mano las dos derivadas de la fila.

La pasada hacia atrás necesita dos cosas de esa fila: cuánto debe cambiar cada peso y cuánto debe cambiar cada entrada. Una multiplicación da las dos. Supongamos que la fila se pasó en `g`. Un peso que se multiplicó por una entrada grande tiene más culpa que uno que se multiplicó por una entrada pequeña, así que cada peso se lleva una parte de `g` proporcional a su entrada, y cada entrada se lleva una parte proporcional al peso que la usó:

```csharp
for (int k = 0; k < len; k++) gradW[k] += g * x[k];
for (int k = 0; k < len; k++) gradX[k] += g * w[k];
```

Los pesos de una fila están unos junto a otros en memoria, así que los dos bucles recorren dos bloques de números consecutivos. Ahí es donde la biblioteca echa mano de SIMD y ejecuta una operación aritmética sobre varios números a la vez.

Esas tres ideas son la diferencia entre las doce líneas del bucle de entrenamiento y el motor de mil líneas que tendrías que leer si no existieran. Ninguna va de *transformers*. Todas están dentro de la línea que dice `loss.backward()`.

## Qué ocurre por debajo

Otros dos números explican la parte plana de la gráfica.

![Entropía cruzada frente al paso de entrenamiento, en escala logarítmica. La pérdida de entrenamiento toca suelo en el paso 1.000, mientras la de prueba se queda cerca de 3,9 y después baja a 2,0 a la vez que el acierto en pares no vistos da el salto.](/blog/grokking-loss.svg)

La pérdida de entrenamiento cae deprisa y toca suelo. La de prueba no se mueve en miles de pasos; un modelo que solo hubiera memorizado mantendría esa forma para siempre. Aquí la pérdida de prueba empieza a caer, y esa caída es la regla que llega. El eje vertical está en escala logarítmica, así que bajar de 3,9 a 2,0 es dividir por dos, y el último decimal importa más de lo que parece: la pérdida de un modelo que responde bien ya está cerca del suelo.

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros sube de 19,1 a 22,3 mientras el modelo memoriza, y después baja a 16,0. En el eje derecho el acierto en pares no vistos se queda cerca del 1 % durante tres mil pasos y después sube al 97 %.](/blog/grokking-norm.svg)

Esta figura tiene **dos ejes**, uno por curva. La línea azul usa el eje izquierdo: el tamaño de los parámetros, de 19 a 22. Es un solo número para todo el modelo, y crece cuando crece cualquier parámetro. La línea roja usa el eje derecho: el acierto en pares que el modelo no ha visto nunca, del 0 % al 100 %.

La línea azul sube primero: el modelo guarda 843 respuestas separadas, y una tabla de consulta exige parámetros grandes. Después baja, porque el decaimiento de pesos tira de los parámetros en cada paso y la tabla se vuelve la opción cara. La línea roja va detrás: la respuesta pequeña y estructurada que suma números módulo 53 necesita menos, y en cuanto sale más barata que la tabla, el acierto en pares no vistos da el salto.

Las tres curvas juntas muestran todo el mecanismo: acierto en entrenamiento, acierto en pares no vistos y tamaño de los parámetros.

## El control

Quita el decaimiento y el modelo no aprende la regla. Memoriza, y eso es todo lo que hace:

| paso | decaimiento | acierto en entrenamiento | acierto en no vistos | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 2.000 | sí | 94 % | 3,4 % | 21,5 |
| 2.000 | no | 99,8 % | 0,1 % | 74,0 |
| 4.000 | sí | 99,6 % | 82,2 % | 17,0 |
| 4.000 | no | 99,8 % | 0,3 % | 94,7 |
| 12.000 | sí | 100 % | **97,3 %** | 16,0 |
| 12.000 | no | 100 % | **0,2 %** | 157,1 |
| 60.000 | no | 100 % | **0,5 %** | 348,2 |

Compara las dos últimas filas con la de arriba. Cinco veces los pasos de la corrida que aprendió la regla, y el acierto en pares no vistos ha trepado del 0,2 % al 0,5 %: **la cuarta parte del 1,9 % que se saca adivinando**, y todavía unos diez pares de 1.966. Esperar no sirve de nada. El modelo no es un aprendiz lento al que le falte tiempo; encontró la tabla y no tiene ninguna razón para dejarla.

Un acierto por debajo del azar es la firma de eso. Un modelo que ha memorizado no duda de los pares que no guardó: está convencido de ellos y se equivoca. El tamaño de los parámetros dice lo mismo, porque crece sin freno hasta veinte veces el del modelo que aprendió la regla: nada en la corrida lo está cobrando.

El decaimiento no es un detalle de la receta que da la casualidad de funcionar. Es la única fuerza de la corrida que abarata la respuesta que generaliza frente a la tabla, y sin él la regla no llega nunca.

## Reprodúcelo

Hace falta el SDK de .NET 10 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, que son unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
dotnet run -c Release
```

La corrida entera tarda unos treinta segundos en un núcleo de un portátil normal, y escribe tres cosas:

| Dónde | Qué |
| --- | --- |
| `data/train.txt`, `data/test.txt` | los dos conjuntos, un par por línea: 843 líneas y 1.966 líneas |
| `runs/grokking.csv` | los números registrados en cada paso |
| `figures/` | las tres gráficas de este artículo |

Cada fila del CSV tiene seis columnas, así que puedes seguir el proceso desde cualquier herramienta:

| Columna | Significado |
| --- | --- |
| `step` | paso de entrenamiento |
| `train_loss` | entropía cruzada media sobre 512 pares de entrenamiento |
| `train_acc` | acierto exacto en esos pares |
| `test_loss` | entropía cruzada media sobre los 1.966 pares no vistos |
| `test_acc` | acierto exacto en los pares no vistos |
| `param_norm` | tamaño de todos los parámetros, como un solo número |

El repositorio trae un `Makefile` para el resto, así que los mismos comandos funcionan en un portátil y en un runner:

```bash
make run                                  # la corrida de arriba
make control                              # la corrida con el decaimiento a cero
make save                                 # entrenar y guardar el modelo
make infer PAIR=12+35                     # preguntarle al modelo guardado
make run ARGS="--p 13 --steps 3000"       # un módulo más pequeño aprende antes
make validate                             # compilar y comprobar el estilo
```

## Inferencia

El fichero `model.pt` **no forma parte del repositorio**. La opción `--save` lo escribe al final de una ejecución y el modelo lo vuelve a cargar. Es una línea en cada dirección, porque una biblioteca guarda por ti el diccionario de estado entero:

```bash
dotnet run -c Release -- --save
dotnet run -c Release -- --infer 12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (90%), 6 (5%), 17 (3%)
```

La entrada es `[START, 12, +, 35, =]`. El modelo la lee y devuelve una probabilidad por cada una de las 53 respuestas posibles. La inferencia es una sola pasada hacia delante: sin gradiente y sin pasada hacia atrás. `--infer` imprime las tres respuestas más probables junto a su probabilidad.

## Lo que la biblioteca no hace por ti

Una biblioteca quita la aritmética, no las decisiones. Dos de ellas salieron mal aquí antes de que la corrida diera el salto, y las dos conviene conocerlas.

**La inicialización.** TorchSharp arranca la tabla de representaciones de los *símbolos* en `N(0, 1)` y una capa lineal en un rango uniforme. El artículo usa la de microgpt, `N(0, 0,08)`, así que el programa la fija en cuatro líneas. Medido por el tamaño de los parámetros, la corrida empieza en 19,1 en vez de en 69,6, y esa diferencia decide si el decaimiento tiene algo con lo que trabajar.

**El decaimiento no es el mismo decaimiento.** `AdamW` resta el decaimiento al peso fuera de la actualización, y `Adam` lo suma al gradiente, como hace microgpt. Con `AdamW` esta corrida no saltó nunca, con ningún decaimiento entre 0,002 y 0,5: la norma de los parámetros se quedaba en 40 o 50 y el modelo seguía en la respuesta memorizada. Con el decaimiento dentro del gradiente funciona `wd = 0,0012`. Dos nombres para la misma palabra, dos corridas distintas y una tarde de confusión.

## Conclusiones

- **La *atención* mueve información de unas posiciones a otras; el *perceptrón* la transforma dentro de una sola.** Todo lo demás en el *transformador* es andamiaje alrededor de esas dos operaciones.
- **Un modelo puede cuadrar los datos sin aprender la regla.** El acierto en entrenamiento es una mala guía: llega al 100 % mientras el de pares no vistos sigue en el azar.
- **El *grokking* es una transición entre dos soluciones.** La que memoriza necesita pesos grandes; la que generaliza necesita menos. El decaimiento de pesos decide cuál sobrevive, y la decisión tarda miles de pasos.
- **Vigila tres números a la vez.** Acierto en entrenamiento, acierto en pares no vistos y tamaño de los parámetros. Una sola curva esconde el mecanismo.

El motor, el conjunto de datos, las gráficas y la ejecución en crudo están en [github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp): la tarea, el modelo y el bucle de entrenamiento, sobre una biblioteca y sin más dependencia que TorchSharp.

Si vas a ejecutar una sola cosa de este artículo, ejecuta esa. Medio minuto en un núcleo de portátil, y ves al modelo sentado encima de la respuesta equivocada durante tres mil pasos para después levantarse y dejarla.
