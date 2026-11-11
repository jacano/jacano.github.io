---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Una red neuronal pequeña memoriza 843 sumas y después aprende a sumar.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Una red neuronal pequeña aprende a sumar números por debajo de 53. Tiene 56.320 números dentro, y entrenar solo cambia esos números. Un paso es un cambio pequeño, hecho después de que la red mire unas cuantas sumas.

En el paso 1.000 la red acierta el 93 % de las sumas con las que se entrena. En las que no ha visto nunca acierta el 32 %. Adivinando acertaría el 1,9 %, porque hay 53 respuestas posibles. Así que ha memorizado 843 sumas y ha aprendido poco.

Después llega el resto. Entre el paso 1.000 y el 3.000 el acierto en las sumas no vistas pasa del 32 % al 94 %, en el 5.000 está en el 99 % y desde el 7.500 está en el 100 %. Termina acertando las 1.966 sumas que nunca vio.

Ese salto tardío es el *grokking*. El nombre viene de [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), que lo vio en redes pequeñas entrenadas con tareas algorítmicas pequeñas. La red es un *transformer* de una sola capa, la misma familia que los modelos que hay detrás de los programas de chat. El experimento entero son dos archivos de C# y unos 90 segundos en un núcleo.

## La tarea

Cuando una suma llega a 53 o más, se resta 53:

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

La entrada son cinco símbolos: `[START]`, el primer número, `+`, el segundo número y `=`. La salida es una puntuación para cada una de las 53 respuestas posibles, y la puntuación más alta es la respuesta que da la red.

Hay 2.809 sumas, porque cada primer número del 0 al 52 puede ir con cada segundo número del 0 al 52. Entreno con el 30 % y dejo el otro 70 % sin ver. Una red siempre puede repetir una suma que ha visto. Las sumas no vistas son la única prueba de que ha aprendido a sumar.

| Propiedad | Valor |
| --- | ---: |
| Respuestas | 53 |
| Sumas | 2.809 |
| Sumas de entrenamiento (30 %) | 843 |
| Sumas no vistas (70 %) | 1.966 |
| Números dentro de la red | 56.320 |
| Acierto por azar | 1,9 % |

## El salto

![Acierto frente al paso de entrenamiento. El acierto en entrenamiento llega al 93 % en el paso 1.000, mientras el de las sumas no vistas está en el 32 %. El acierto en sumas no vistas sube al 94 % en el 3.000 y al 99 % en el 5.000, y las dos líneas están en el 100 % desde el 7.500.](/blog/grokking-cliff-es.svg)

La línea azul son las sumas de entrenamiento; la roja, las no vistas. En el paso 1.000 la azul está en el 93 % y la roja en el 32 %. La roja sube despacio al principio y después rápido, y las dos líneas se juntan cerca del paso 4.000.

La parte plana es la interesante. La red no está atascada. Ya sabe las respuestas de sus propias sumas, y durante esos pasos está sustituyendo poco a poco su tabla por algo que también funciona para las sumas que no ha visto.

## Por qué pasa

Dos soluciones distintas encajan con las 843 sumas de entrenamiento. La primera es una tabla: guardar la respuesta de cada una. Es rápida, y no dice nada de una suma que no esté en la tabla. La segunda es la suma misma, que acierta todas.

Las dos son posibles, y el entrenamiento no prefiere ninguna. **Adam**, el optimizador habitual (la parte que decide cuánto mover cada número), solo empuja las respuestas a ser menos malas en cada paso. Lo que decide aquí es el **decaimiento de pesos** (*weight decay*): en cada paso el entrenamiento también tira de los 56.320 números un poco hacia cero. Una tabla necesita números grandes, uno por cada respuesta guardada. Sumar necesita números más pequeños. Así que la tabla se va encareciendo y gana la solución barata.

El tamaño de esos números lo enseña:

![Tamaño de los números y acierto frente al paso de entrenamiento, cada uno en su eje. El tamaño baja de 18,9 a 8,8 en 250 pasos, sube a 11,0 mientras el modelo memoriza y se asienta en 9,3. El acierto en sumas no vistas sube del 1,8 % al 100 %.](/blog/grokking-norm-es.svg)

Baja de 18,9 a 8,8 en los primeros 250 pasos, sube a 11,0 mientras crece la tabla y se asienta en 9,3 cuando gana la suma.

## Dónde va el decaimiento

El mismo decaimiento da resultados distintos según dónde se aplique. Aquí se suma al cambio de cada paso, que es lo que hace el código original. La otra forma habitual es encoger los números después del paso, y eso es lo que hace el optimizador `AdamW`. Con `AdamW` este entrenamiento no aprende a sumar: termina en el 30,9 % de las sumas no vistas, el mismo número que el control de abajo, y los números acaban en unos 56 en lugar de 9,3.

Así que «decaimiento de pesos» significa dos cosas distintas, y una de ellas aquí no hace nada.

## El control

Con el decaimiento a cero el entrenamiento no llega:

| paso | decaimiento | entrenamiento | no vistas | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 20.000 | sí | 100 % | 100 % | 9,3 |
| 20.000 | no | 100 % | 30,9 % | 61,2 |

Sin el decaimiento la red memoriza las 843 sumas y ahí se queda. Del paso 2.000 al 20.000 el acierto en las no vistas se mueve entre el 30,6 % y el 30,9 %, y los números crecen hasta 61 porque nada los está cobrando.

## El modelo

La red es la de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy: un *transformer* de una capa y 64 dimensiones. TorchSharp calcula cuánto cambiar cada número después de cada respuesta, así que el modelo es una clase y el bucle de entrenamiento unas pocas líneas.

## Reprodúcelo

Hace falta el SDK de .NET 11 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
make run
```

`make` a secas compila y comprueba el estilo; no entrena. `make` no viene con Windows: usa `dotnet run -c Release` donde pone `make run`.

El entrenamiento tarda unos 90 segundos y escribe las dos listas de sumas, un CSV con una fila por paso (el error y el acierto en cada lado, y el tamaño de los números) y las gráficas. `make control` lo repite con el decaimiento a cero, y `make run ARGS="--p 13 --steps 3000"` cambia el módulo o el número de pasos.

El entrenamiento tiene 20.000 pasos por defecto. Los últimos 2.000 hacen cada paso más pequeño, hasta cero, para que el entrenamiento se pare en la solución que encontró en lugar de saltar alrededor.

## Pregúntale una suma a la red

El entrenamiento no guarda la red, así que `make save` la escribe en `model.pt` y `make infer` la lee:

```bash
make infer PAIR=12+35
```

```
inference 12+35 = 47  [ok]  top: 47 (89%), 21 (2%), 52 (2%)
```

`12 + 35` es una de las sumas que me guardé, así que ese 89 % en el `47` es la suma funcionando, no una respuesta guardada. `make explain PAIR=12+35` escribe las 53 respuestas en `runs/probabilities.csv` y las dibuja en `figures/grokking-probabilities.svg`.

## Lo que saco en claro

El acierto en las sumas de entrenamiento dice muy poco por sí solo. En este caso, el decaimiento de pesos elige entre una tabla y la regla.

No soy investigador de aprendizaje automático. Esto es un experimento pequeño que he podido reproducir de principio a fin, entender y disfrutar viéndolo moverse. El código, los datos y los registros están en
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp),
para quien quiera verlo ocurrir: se ejecuta en minuto y medio.
