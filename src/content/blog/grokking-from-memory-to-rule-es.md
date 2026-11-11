---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un transformador pequeño memoriza 843 sumas, falla casi todas las que no ha visto durante mil pasos y entonces aprende a sumar. Termina con todos los pares que no había visto nunca.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Un transformador de 56.320 parámetros aprende a sumar módulo 53. En el paso 1.000 acierta el 93 % de los pares con los que se entrena y el 32 % de los que no ha visto nunca. Adivinando acertaría el 1,9 %. Ha memorizado 843 sumas y, en la mayoría, no ha aprendido nada.

El hueco se cierra a lo largo de los dos mil pasos siguientes. En el paso 3.000 acierta el 94 % de los pares no vistos, en el 5.000 está en el 99 % y desde el 7.500 los acierta todos. El entrenamiento termina en el **100 %**: 1.966 de los 1.966 pares que nunca vio.

Ese salto tardío es el *grokking*. El nombre viene de [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), que lo describió en redes pequeñas entrenadas con conjuntos de datos algorítmicos pequeños. La arquitectura es el *transformador* (*transformer*) de [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). El experimento entero son dos archivos de C# y unos 90 segundos en un núcleo.

## La tarea

El módulo es 53. El modelo lee una suma y devuelve el resultado módulo 53, así que la respuesta es siempre un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

Hay 2.809 pares en total. Entreno con el 30 % y reservo el resto, así que esos pares no vistos son la única prueba de que el modelo ha aprendido aritmética y no una tabla de consulta.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares no vistos (70 %) | 1.966 |
| Vocabulario | 56 *símbolos* (*tokens*) |
| Longitud del documento | 6 *símbolos* |
| Posiciones de predicción | 5 |
| Parámetros | 56.320 |
| Pasos de entrenamiento | 20.000 |
| Acierto por azar | 1,9 % |

El vocabulario tiene 56 entradas: los 53 números, `+`, `=` y un *símbolo* de inicio. Cada número es un solo *símbolo*, así que el operando llega entero en lugar de dígito a dígito.

Un documento es una sola secuencia, y el modelo predice cada *símbolo* siguiente. Solo la última predicción es la tarea:

| Posición | Símbolo | Papel |
| ---: | :---: | --- |
| 1 | `[START]` | inicio del documento |
| 2 | `12` | primer operando |
| 3 | `+` | el operador |
| 4 | `35` | segundo operando |
| 5 | `=` | la entrada en la posición de la respuesta |
| 6 | `47` | **el objetivo** |

## El acantilado

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto en entrenamiento llega al 93 % en el paso 1.000, mientras el de pares no vistos está en el 32 %. El acierto en pares no vistos sube al 94 % en el 3.000, al 99 % en el 5.000 y se queda en el 100 % desde el 7.500.](/blog/grokking-cliff.svg)

La línea azul es el acierto en los pares de entrenamiento. La línea roja, el de los pares no vistos.

El acierto en entrenamiento llega al **93 % en el paso 1.000** y se queda entre el 78 % y el 100 % a partir de ahí. El de los pares no vistos está en el 32 % en ese momento y sube despacio durante otros dos mil pasos. Después se mueve: **94 % en el paso 3.000**, 98 % en el 4.000, 99 % en el 5.000 y 100 % desde el 7.500 hasta el final.

La parte plana de esa curva es la que merece la pena entender. El modelo no está atascado: está cambiando de opinión.

La pérdida en la respuesta cuenta lo mismo. Empieza en 4,1, el valor de una conjetura uniforme sobre 53 respuestas, y baja a 0,1 en los pares de entrenamiento hacia el paso 2.000. La de los pares no vistos se queda por encima de 2,0 hasta el paso 3.000 y entonces cae a 0,13:

![Entropía cruzada en la respuesta, en escala logarítmica. La pérdida de entrenamiento baja de 4,1 a 0,1 hacia el paso 2.000, mientras la de los pares no vistos se queda por encima de 2,0 hasta el paso 3.000 y después cae a 0,13.](/blog/grokking-loss.svg)

**La pérdida es un solo número que dice cuánto se equivocó el modelo.** Depende de la probabilidad que le dio a la respuesta correcta: con un 100 % es 0,0; con un 50 %, 0,7; con un 10 %, 2,3; con un 1 %, 4,6. La regla se llama **entropía cruzada** y nunca baja de cero.

Esa probabilidad sale de un _softmax_ sobre las 53 respuestas, así que no es la opinión privada del modelo sobre la correcta: subir la puntuación de cualquier respuesta equivocada le quita probabilidad a la correcta y sube la pérdida. Por eso un modelo equivocado con convencimiento puntúa peor que uno que duda.

## Qué parece provocar el salto

Dos soluciones encajan con los datos de entrenamiento, y solo una generaliza.

La primera es una tabla: guardar cada uno de los 843 pares. Encaja rápido y no dice nada de un par que no esté en ella.

La segunda es la aritmética. Solo encaja cuando el modelo encuentra una representación interna que la calcule, y entonces acierta los pares no vistos igual de bien que los de entrenamiento.

El optimizador no sabe nada de ninguna de las dos. Reduce una pérdida y nada más. En este entrenamiento, lo que inclina la balanza es el **decaimiento de pesos** (*weight decay*): en cada paso, el optimizador también tira un poco de cada parámetro hacia cero.

Una tabla necesita parámetros grandes, una entrada por respuesta guardada. La solución estructurada necesita menos. Así que la tabla se va encareciendo con los pasos, y cuando la regla es la opción barata, el descenso por gradiente se desliza hacia ella. Medido como un solo número para todo el modelo, el tamaño de los parámetros baja de 18,9 a 8,8 en los primeros 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3 cuando manda la regla:

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros baja de 18,9 a 8,8 en 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3. En el eje derecho el acierto en pares no vistos sube del 1,8 % al 100 %.](/blog/grokking-norm.svg)

Para saber qué acaba calculando el modelo, merece la pena leer el trabajo que siguió a este problema: [Progress measures for grokking via mechanistic interpretability](https://arxiv.org/abs/2301.05217) (Nanda et al., 2023) desmonta el mismo juguete y encuentra un puñado de componentes periódicas en lugar de una tabla.

## El control

Si el decaimiento es lo que selecciona la regla, quitarlo debería romper el entrenamiento. Y lo rompe.

| paso | decaimiento | acierto en entrenamiento | acierto en no vistos | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 2.000 | sí | 98,8 % | 64,0 % | 10,7 |
| 2.000 | no | 100 % | 30,6 % | 36,2 |
| 4.000 | sí | 99,8 % | 98,1 % | 9,7 |
| 4.000 | no | 100 % | 30,6 % | 41,0 |
| 12.000 | sí | 100 % | 100 % | 9,4 |
| 12.000 | no | 100 % | 30,8 % | 53,0 |
| 20.000 | no | 100 % | **30,9 %** | 61,2 |

Sin decaimiento el modelo memoriza todos los pares de entrenamiento y acierta el 30,9 % de los no vistos. Y ahí se queda: el acierto se mueve entre el 30,6 % y el 30,9 % desde el paso 2.000 hasta el 20.000, y el tamaño de los parámetros sube a 61 porque nada en el entrenamiento lo está cobrando.

El salto no es un aprendiz lento que llega tarde. Sin decaimiento, nada en este entrenamiento prefiere la solución barata, y más pasos no cambian eso: solo hacen la tabla más grande.

## El modelo

El modelo es el de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy: una capa, 64 dimensiones, 8 cabezas, RMSNorm en lugar de LayerNorm, sin sesgos y ReLU en lugar de GeLU. La *atención* deja que cada posición lea las anteriores. El *perceptrón* (*MLP*) transforma lo que ha leído. Los dos suman su resultado a su entrada, así que la señal tiene un camino directo por la capa.

No hay *embedding* posicional. El *símbolo* ya dice qué operando es, porque `a` va antes del `+` y `b` va después. La suma es simétrica, así que una segunda tabla que distinga los dos huecos solo añade parámetros.

Esa es toda la arquitectura. El resto del repositorio son el bucle de entrenamiento, el conjunto de datos y las gráficas; la diferenciación automática la pone TorchSharp, así que el modelo es una clase y el bucle unas pocas líneas. En el repositorio también están escritos los tres ajustes que más me costó acertar.

## Reprodúcelo

Hace falta el SDK de .NET 11 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` a secas compila y comprueba el estilo; no entrena. `make` no viene con Windows, y para ese caso cada objetivo tiene su forma en `dotnet`: `dotnet run -c Release` donde pone `make run`.

El entrenamiento tarda unos 90 segundos y escribe tres cosas:

| Dónde | Qué |
| --- | --- |
| `data/train.txt`, `data/test.txt` | los dos conjuntos, un par por línea: 843 líneas y 1.966 líneas |
| `runs/grokking.csv` | los números registrados en cada paso |
| `figures/` | las gráficas de este artículo |

Cada fila de `runs/grokking.csv` tiene seis columnas:

| Columna | Significado |
| --- | --- |
| `step` | paso de entrenamiento |
| `train_loss` | entropía cruzada en la respuesta sobre 512 pares de entrenamiento |
| `train_acc` | acierto exacto en esos pares |
| `test_loss` | entropía cruzada en la respuesta sobre los 1.966 pares no vistos |
| `test_acc` | acierto exacto en los pares no vistos |
| `param_norm` | norma L2 de los 56.320 parámetros: la raíz de la suma de sus cuadrados |

El repositorio trae un `Makefile` con un objetivo por acción. `make help` los lista, y los dos que importan aquí son:

| comando | qué hace |
| --- | --- |
| `make control` | el mismo entrenamiento con el decaimiento a cero, que no aprende la regla |
| `make run ARGS="--p 13 --steps 3000"` | otro módulo, u otro número de pasos |

Los valores por defecto son una tasa de aprendizaje de 0,003, un decaimiento de 0,005 y 20.000 pasos. Los últimos 2.000 pasos llevan la tasa de aprendizaje a cero, para que el entrenamiento se asiente en la solución que encontró en lugar de terminar en una oscilación. Una semilla más lenta necesita más pasos: el mismo modelo llega al 100 % con `--steps 44000 --anneal 4000`.

## Pregúntale una suma al modelo

El entrenamiento no guarda el modelo, así que el primer paso es escribirlo en disco:

```bash
make save
```

Eso deja `model.pt` en la carpeta del repositorio. `make infer` lo carga y pregunta por una suma:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

El modelo lee `[START, 12, +, 35, =]` y devuelve una probabilidad por cada respuesta posible; la línea imprime las tres más altas. `12 + 35` es uno de los pares que me guardé, así que ese 89 % en el `47` es la regla funcionando y no una respuesta almacenada.

Para ver las 53 respuestas en lugar de tres:

```bash
make explain PAIR=12+35
```

Eso las escribe en `runs/probabilities.csv` y las dibuja en `figures/grokking-probabilities.svg`.

## Lo que saco en claro

- **El acierto en entrenamiento dice muy poco por sí solo.** Aquí llega al 93 % mientras el de los pares no vistos está en el 32 %.
- **El entrenamiento se comporta como una transición entre dos respuestas.** Una guarda los pares y necesita parámetros grandes; la otra calcula la regla y necesita menos.
- **En este entrenamiento, el decaimiento de pesos es lo que inclina la balanza.** Con él llega el salto; a cero no llega nunca, en los 20.000 pasos que probé, con una semilla y un módulo.
- **El tamaño de los parámetros se movió antes,** en las dos direcciones: bajó de golpe, subió mientras el modelo memorizaba y volvió a bajar cuando manda la regla.

No soy investigador de aprendizaje automático. Esto es un experimento pequeño que he podido reproducir de principio a fin, entender y disfrutar viéndolo moverse. El código, los datos y los registros están en
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
para quien quiera verlo ocurrir: se ejecuta en minuto y medio.
