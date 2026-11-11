---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un transformador pequeño memoriza 843 sumas y después aprende a sumar. Este es el entrenamiento y el salto que separa las dos cosas.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Un transformador de 56.320 parámetros aprende a sumar módulo 53. En el paso 1.000 acierta el 93 % de los pares con los que se entrena. En los que no ha visto nunca está en el 32 %, y adivinando acertaría el 1,9 %. Ha memorizado 843 sumas y la mayor parte de la regla sigue sin aparecer.

El hueco se cierra a lo largo de los dos mil pasos siguientes: el 94 % de los pares no vistos en el paso 3.000, el 99 % en el 5.000 y todos desde el 7.500. El entrenamiento termina en el **100 %**: 1.966 de los 1.966 pares que nunca vio.

Ese salto tardío es el *grokking*. El nombre viene de [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), que lo describió en redes pequeñas entrenadas con conjuntos de datos algorítmicos pequeños. La arquitectura es el *transformador* (*transformer*) de [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). El experimento entero son dos archivos de C# y unos 90 segundos en un núcleo.

## La tarea

El módulo es 53. El modelo lee una suma y devuelve el resultado módulo 53, así que la respuesta es siempre un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17
50 + 50 = 100  →  47
```

Hay 2.809 pares. Entreno con el 30 % y reservo el resto, así que esos pares no vistos son la única prueba de que el modelo ha aprendido aritmética y no una tabla de consulta.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares no vistos (70 %) | 1.966 |
| Vocabulario | 56 *símbolos* (*tokens*) |
| Parámetros | 56.320 |
| Acierto por azar | 1,9 % |

El vocabulario tiene 56 entradas: los 53 números, `+`, `=` y un *símbolo* de inicio. Un documento son seis *símbolos*, y el modelo predice cada uno de los siguientes:

| Posición | Símbolo | Papel |
| ---: | :---: | --- |
| 1 | `[START]` | inicio del documento |
| 2 | `12` | primer operando |
| 3 | `+` | el operador |
| 4 | `35` | segundo operando |
| 5 | `=` | la posición de la respuesta |
| 6 | `47` | **el objetivo** |

## El salto

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto en entrenamiento llega al 93 % en el paso 1.000, mientras el de pares no vistos está en el 32 %. El acierto en pares no vistos sube al 94 % en el 3.000 y al 99 % en el 5.000, y las dos líneas están en el 100 % desde el 7.500.](/blog/grokking-cliff.svg)

La línea azul son los pares de entrenamiento; la roja, los no vistos. El modelo memoriza en el paso 1.000, con los pares no vistos todavía en el 32 %. Las dos líneas se juntan hacia el paso 4.000.

La parte plana de la curva es la que merece la pena mirar. El modelo no está atascado: está cambiando de opinión.

## Por qué pasa

Dos soluciones encajan con los datos de entrenamiento. Una es una tabla con los 843 pares: rápida, e inútil para un par que no esté en ella. La otra es la aritmética, que solo encaja cuando el modelo encuentra una representación que la calcule, y entonces acierta todo.

El optimizador no sabe nada de ninguna de las dos. Reduce una pérdida y nada más. En este entrenamiento la balanza se inclina con el **decaimiento de pesos** (*weight decay*), que tira de cada parámetro hacia cero en cada paso. Cobra por el tamaño, y la tabla es la solución grande, así que según avanza el entrenamiento el descenso por gradiente se desliza hacia la aritmética.

Los números del propio entrenamiento apuntan a eso:

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros baja de 18,9 a 8,8 en 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3. En el eje derecho el acierto en pares no vistos sube del 1,8 % al 100 %.](/blog/grokking-norm.svg)

El tamaño de los parámetros baja de 18,9 a 8,8 en los primeros 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3 cuando llega la regla.

## El control

Con el decaimiento a cero el entrenamiento no llega:

| paso | decaimiento | acierto en entrenamiento | acierto en no vistos | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 20.000 | sí | 100 % | 100 % | 9,3 |
| 20.000 | no | 100 % | 30,9 % | 61,2 |

Sin decaimiento el modelo memoriza el conjunto de entrenamiento y ahí se queda: más pasos no mueven el número de los no vistos.

## El modelo

El modelo es el de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy: una capa, 64 dimensiones, 8 cabezas y las mismas piezas pequeñas que el original. Cada posición puede leer las anteriores, una red pequeña transforma lo que ha leído y las dos cosas suman su resultado a su entrada.

No hay *embedding* posicional. El *símbolo* ya dice qué operando es, porque `a` va antes del `+` y `b` va después, y la suma es simétrica. Una segunda tabla distinguiría los dos huecos y no aportaría nada.

Esa es toda la arquitectura. La diferenciación automática la pone TorchSharp, así que el modelo es una clase y el bucle unas pocas líneas.

## Reprodúcelo

Hace falta el SDK de .NET 11 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` a secas compila y comprueba el estilo; no entrena. `make` no viene con Windows: usa `dotnet run -c Release` donde pone `make run`.

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
| `train_loss` | pérdida en la respuesta sobre 512 pares de entrenamiento |
| `train_acc` | acierto exacto en esos pares |
| `test_loss` | pérdida en la respuesta sobre los 1.966 pares no vistos |
| `test_acc` | acierto exacto en los pares no vistos |
| `param_norm` | longitud de los 56.320 parámetros: la raíz de la suma de sus cuadrados |

El Makefile tiene un objetivo por acción; `make help` los lista. Los dos que importan aquí son `make control`, que repite el entrenamiento con el decaimiento a cero, y `make run ARGS="--p 13 --steps 3000"`, que cambia el módulo o el número de pasos.

Los valores por defecto son una tasa de aprendizaje de 0,003, un decaimiento de 0,005 y 20.000 pasos. Los últimos 2.000 llevan la tasa de aprendizaje a cero, para que el entrenamiento se asiente en lugar de terminar en una oscilación.

## Pregúntale una suma al modelo

El entrenamiento no guarda el modelo, así que `make save` lo escribe en `model.pt` y `make infer` lo lee:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` es uno de los pares que me guardé, así que ese 89 % en el `47` es la regla funcionando, no una respuesta almacenada. `make explain PAIR=12+35` escribe las 53 respuestas en `runs/probabilities.csv` y las dibuja en `figures/grokking-probabilities.svg`.

## Lo que saco en claro

El acierto en entrenamiento dice muy poco por sí solo. En este entrenamiento, el decaimiento de pesos es lo que elige la regla en lugar de la tabla.

No soy investigador de aprendizaje automático. Esto es un experimento pequeño que he podido reproducir de principio a fin, entender y disfrutar viéndolo moverse. El código, los datos y los registros están en
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
para quien quiera verlo ocurrir: se ejecuta en minuto y medio.
