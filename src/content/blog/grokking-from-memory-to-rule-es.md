---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Una red neuronal pequeña memoriza 843 sumas y después aprende a sumar.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Una red neuronal pequeña aprende a sumar módulo 53. Tiene 56.320 números dentro, y entrenar consiste en ajustar esos números. En el paso 1.000 acierta el 93 % de las sumas con las que se entrena y el 32 % de las que no ha visto nunca; adivinando acertaría el 1,9 %. Ha memorizado 843 sumas y la mayor parte de la regla sigue sin aparecer.

Dos mil pasos después llega el resto: el 94 % de las sumas no vistas en el paso 3.000, el 99 % en el 5.000 y todas desde el 7.500. El entrenamiento termina en el **100 %**: 1.966 de las 1.966 sumas que nunca vio.

Ese salto tardío es el *grokking*. El nombre viene de [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), que lo describió en redes pequeñas entrenadas con conjuntos de datos algorítmicos pequeños. La red es un *transformer*, el tipo que hay detrás de los modelos de lenguaje, de una sola capa. El experimento son dos archivos de C# y unos 90 segundos en un núcleo.

## La tarea

El modelo lee cinco símbolos —`[START]`, el primer número, `+`, el segundo número, `=`— y devuelve una puntuación para cada una de las 53 respuestas posibles.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17
50 + 50 = 100  →  47
```

Hay 2.809 sumas. Entreno con el 30 % y reservo el resto, así que las sumas no vistas son la única prueba de que el modelo ha aprendido aritmética y no una tabla de consulta.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Sumas | 2.809 |
| Sumas de entrenamiento (30 %) | 843 |
| Sumas no vistas (70 %) | 1.966 |
| Parámetros | 56.320 |
| Acierto por azar | 1,9 % |

## El salto

![Acierto en entrenamiento y en sumas no vistas frente al paso de entrenamiento. El acierto en entrenamiento llega al 93 % en el paso 1.000, mientras el de las sumas no vistas está en el 32 %. El acierto en sumas no vistas sube al 94 % en el 3.000 y al 99 % en el 5.000, y las dos líneas están en el 100 % desde el 7.500.](/blog/grokking-cliff.svg)

La línea azul son las sumas de entrenamiento; la roja, las no vistas. El modelo memoriza en el paso 1.000, con las sumas no vistas todavía en el 32 %. Las dos líneas se juntan hacia el paso 4.000.

La parte plana de la curva es la que merece la pena mirar. El modelo no está atascado: está cambiando de opinión.

## Por qué pasa

Dos soluciones encajan con los datos de entrenamiento. Una es una tabla con las 843 sumas: rápida, e inútil para una suma que no esté en ella. La otra es la regla, que acierta todas.

El entrenamiento solo intenta que las respuestas sean menos malas; no prefiere ninguna de las dos. En este caso la balanza se inclina con el **decaimiento de pesos** (*weight decay*), un pequeño cobro por el tamaño de los 56.320 números en cada paso. La tabla necesita números grandes y la regla los necesita pequeños, así que la tabla se va encareciendo y el entrenamiento se desliza hacia la regla.

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros baja de 18,9 a 8,8 en 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3. En el eje derecho el acierto en sumas no vistas sube del 1,8 % al 100 %.](/blog/grokking-norm.svg)

El tamaño de los números baja de 18,9 a 8,8 en los primeros 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3 cuando llega la regla.

## El control

Con el decaimiento a cero el entrenamiento no llega:

| paso | decaimiento | entrenamiento | no vistas | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 20.000 | sí | 100 % | 100 % | 9,3 |
| 20.000 | no | 100 % | 30,9 % | 61,2 |

Sin decaimiento el modelo memoriza las sumas de entrenamiento y ahí se queda: más pasos no mueven el número de las no vistas.

## El modelo

La red es la de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy: un *transformer* de una capa y 64 dimensiones. TorchSharp calcula cómo ajustar los números después de cada respuesta, así que el modelo es una clase y el bucle de entrenamiento unas pocas líneas.

## Reprodúcelo

Hace falta el SDK de .NET 11 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` a secas compila y comprueba el estilo; no entrena. `make` no viene con Windows: usa `dotnet run -c Release` donde pone `make run`.

El entrenamiento tarda unos 90 segundos y escribe los dos conjuntos, un CSV con una fila por paso (el error y el acierto en cada lado, y el tamaño de los números) y las gráficas. `make control` lo repite con el decaimiento a cero, y `make run ARGS="--p 13 --steps 3000"` cambia el módulo o el número de pasos.

Los valores por defecto son 20.000 pasos. Los últimos 2.000 llevan la tasa de aprendizaje a cero, para que el entrenamiento se asiente en lugar de terminar en una oscilación.

## Pregúntale una suma al modelo

El entrenamiento no guarda el modelo, así que `make save` lo escribe en `model.pt` y `make infer` lo lee:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` es una de las sumas que me guardé, así que ese 89 % en el `47` es la regla funcionando, no una respuesta almacenada. `make explain PAIR=12+35` escribe las 53 respuestas en `runs/probabilities.csv` y las dibuja en `figures/grokking-probabilities.svg`.

## Lo que saco en claro

El acierto en entrenamiento dice muy poco por sí solo. En este caso, el decaimiento de pesos es lo que elige la regla en lugar de la tabla.

No soy investigador de aprendizaje automático. Esto es un experimento pequeño que he podido reproducir de principio a fin, entender y disfrutar viéndolo moverse. El código, los datos y los registros están en
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
para quien quiera verlo ocurrir: se ejecuta en minuto y medio.
