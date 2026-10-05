---
title: 'Grokking: el salto de la memoria a la regla'
date: '2026-10-05'
tag: 'Machine Learning'
excerpt: 'Un transformador pequeño memoriza 843 sumas, falla casi todas las que no ha visto durante tres mil pasos y entonces aprende a sumar. Este es ese entrenamiento, y el único hiperparámetro que lo decide.'
lang: 'es'
pair: 'grokking-from-memory-to-rule'
---

Un transformador de 56.640 parámetros aprende a sumar módulo 53. En el paso 1.000 acierta el 98 % de los pares con los que se entrena y el 1,2 % de los que no ha visto nunca. Adivinando acertaría el 1,9 %. Ha memorizado 843 sumas y no ha aprendido nada.

Y ahí sigue durante dos mil pasos más. El acierto en entrenamiento ya está en su techo, así que cualquier resumen del entrenamiento parece terminado. Entonces, entre el paso 3.500 y el 3.750, el acierto en los pares que no ha visto pasa del 28 % al 74 %, y en el paso 5.000 es del 92 %. Termina en el 97,3 %: 1.912 de los 1.966 pares que nunca vio.

Ese salto tardío es el *grokking*. El nombre viene de [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177) (Power et al., 2022), que lo describió en redes pequeñas entrenadas con conjuntos de datos algorítmicos pequeños. La arquitectura es el *transformador* (*transformer*) de [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (Vaswani et al., 2017). El experimento entero son 329 líneas de C# y 26 segundos en un núcleo.

## La tarea

El módulo es 53. El modelo lee una suma y devuelve el resultado módulo 53, así que la respuesta es siempre un número entre 0 y 52.

```
12 + 35 = 47           ya está por debajo de 53
40 + 30 = 70   →  17   70 - 53 = 17
50 + 50 = 100  →  47   100 - 53 = 47
```

Hay 2.809 pares en total. Entreno con el 30 % y reservo el resto, así que los pares reservados son la única prueba de que el modelo ha aprendido aritmética y no una tabla de consulta.

| Propiedad | Valor |
| --- | ---: |
| Módulo | 53 |
| Pares | 2.809 |
| Pares de entrenamiento (30 %) | 843 |
| Pares reservados (70 %) | 1.966 |
| Vocabulario | 56 *símbolos* (*tokens*) |
| Longitud del documento | 6 *símbolos* |
| Posiciones de predicción | 5 |
| Parámetros | 56.640 |
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

![Acierto en entrenamiento y en pares no vistos frente al paso de entrenamiento. El acierto en entrenamiento llega al 98 % en el paso 1.000, mientras el de pares no vistos está en el 1,2 %. El acierto en pares no vistos sube del 13 % en el paso 3.000 al 74 % en el 3.750 y llega al 97 % en el 5.000.](/blog/grokking-cliff.svg)

La línea azul es el acierto en los pares de entrenamiento. La línea roja, el de los pares reservados.

El acierto en entrenamiento llega al **98 % en el paso 1.000** y ya no vuelve a bajar mucho de ahí. El de los pares reservados está en el 1,2 % en ese momento, y se queda entre el 1 % y el 28 % durante otros 2.500 pasos. Después se mueve: **74 % en el paso 3.750**, 82 % en el 4.000, 92 % en el 5.000 y 97,3 % al final.

La parte plana de esa curva es la que merece la pena entender. El modelo no está atascado: está cambiando de opinión.

Dos gráficas muestran qué significa eso para una suma que el modelo no vio nunca. En el paso 1.000, `12 + 35`:

![Gráfica de barras con las 53 respuestas que el modelo considera para 12 + 35, tras 1.000 pasos. La respuesta correcta, 47, tiene una barra del 0,3 %, y la barra más alta, la de la respuesta 6, llega al 40 %.](/blog/grokking-probs-early.svg)

La respuesta correcta recibe un 0,3 %. El modelo no está indeciso: da un 40 % a la respuesta 6 y un 27 % a la 36. Tiene una opinión, y la opinión es equivocada.

En el paso 12.000, la misma suma:

![La misma gráfica tras 12.000 pasos. La barra de la respuesta correcta, 47, llega al 90 %, y todas las demás están cerca de cero.](/blog/grokking-probs-late.svg)

El 47 recibe un 90 %, y ninguna otra se le acerca.

Merece la pena pararse aquí, porque explica un número de la tabla anterior. Un modelo así no duda nunca en el sentido corriente. La entropía cruzada solo mira la probabilidad de la respuesta correcta, de modo que una respuesta equivocada sostenida con confianza puntúa peor que una duda. Por eso el acierto en pares reservados puede quedar por debajo del azar: el modelo no se está cubriendo las espaldas, está equivocado con convencimiento.

## Por qué ocurre el salto

Dos soluciones encajan con los datos de entrenamiento, y solo una generaliza.

La primera es una tabla: guardar cada uno de los 843 pares. Encaja rápido y no dice nada de un par que no esté en ella.

La segunda es la aritmética. Solo encaja cuando el modelo encuentra una representación interna que la calcule, y entonces acierta los pares reservados igual de bien que los de entrenamiento.

El optimizador no sabe nada de ninguna de las dos. Reduce una pérdida y nada más. Lo que decide entre ambas es el **decaimiento de pesos** (*weight decay*): en cada paso, el optimizador también tira un poco de cada parámetro hacia cero.

Una tabla necesita parámetros grandes, una entrada por respuesta guardada. La solución estructurada necesita menos. Así que el decaimiento encarece la tabla poco a poco, y cuando la regla es la opción barata, el descenso por gradiente entra en ella. Medido como un solo número para todo el modelo, el tamaño de los parámetros sube de 19,1 a 22,3 mientras memoriza, y después baja a 16,0 cuando manda la regla:

![Dos curvas frente al paso de entrenamiento, cada una en su eje. En el eje izquierdo el tamaño de los parámetros sube de 19,1 a 22,3 mientras el modelo memoriza, y después baja a 16,0. En el eje derecho el acierto en pares no vistos se queda cerca del 1 % durante tres mil pasos y después sube al 97 %.](/blog/grokking-norm.svg)

La pérdida cuenta lo mismo. La de entrenamiento toca su suelo pronto y ahí se queda, mientras la de prueba se mantiene cerca de 3,9 durante miles de pasos y después cae a 2,0 a la vez que el acierto da el salto:

![Entropía cruzada frente al paso de entrenamiento, en escala logarítmica. La pérdida de entrenamiento toca suelo en el paso 1.000, mientras la de prueba se queda cerca de 3,9 y después baja a 2,0 a la vez que el acierto en pares no vistos da el salto.](/blog/grokking-loss.svg)

Para saber qué acaba calculando el modelo, merece la pena leer el trabajo que siguió a este problema: [Progress measures for grokking via mechanistic interpretability](https://arxiv.org/abs/2301.05217) (Nanda et al., 2023) desmonta el mismo juguete y encuentra un puñado de componentes periódicas en lugar de una tabla.

## El control

Si el decaimiento es lo que selecciona la regla, quitarlo debería romper el entrenamiento. Y lo rompe.

| paso | decaimiento | acierto en entrenamiento | acierto en no vistos | tamaño |
| ---: | :--- | ---: | ---: | ---: |
| 2.000 | sí | 94 % | 3,4 % | 21,5 |
| 2.000 | no | 99,8 % | 0,1 % | 74,0 |
| 4.000 | sí | 99,6 % | 82,2 % | 17,0 |
| 4.000 | no | 99,8 % | 0,3 % | 94,7 |
| 12.000 | sí | 100 % | **97,3 %** | 16,0 |
| 12.000 | no | 100 % | **0,2 %** | 157,1 |
| 60.000 | no | 100 % | **0,5 %** | 348,2 |

Sin decaimiento el modelo memoriza los pares de entrenamiento y acierta el 0,2 % de los reservados. Cinco veces más pasos no cambian el resultado: en el paso 60.000 está en el 0,5 %, la cuarta parte del 1,9 % que se saca adivinando, y el tamaño de los parámetros ha pasado de 16 a 348 porque nada en el entrenamiento lo está cobrando.

El salto no es un aprendiz lento que llega tarde. Sin decaimiento no hay ningún mecanismo que prefiera la solución barata, y más pasos no lo crean: solo hacen la tabla más grande.

## El modelo

El modelo es el de [microgpt](https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95), de Andrej Karpathy: una capa, 64 dimensiones, 8 cabezas, RMSNorm en lugar de LayerNorm, sin sesgos y ReLU en lugar de GeLU. La *atención* deja que cada posición lea las anteriores. El *perceptrón* (*MLP*) transforma lo que ha leído. Los dos suman su resultado a su entrada, así que la señal tiene un camino directo por la capa.

La pasada hacia delante entera son diez líneas, y TorchSharp lleva todo lo demás:

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

y el paso de entrenamiento son tres más:

```csharp
Tensor loss = lossFn.forward(logits.reshape(-1, Vocab), targets.reshape(-1));
loss.backward();
optimiser.step();
```

Escrito a mano, el mismo entrenamiento son unas mil líneas, porque hay que escribir también la diferenciación automática. Ese es el intercambio que hace este repositorio: no hay derivadas que leer y todas las decisiones siguen siendo tuyas. Dos de ellas me costaron una tarde.

## Dos trampas

**La inicialización.** TorchSharp arranca la tabla de representaciones en `N(0, 1)` y una capa lineal en un rango uniforme. microgpt usa `N(0, 0,08)`. Medido por el tamaño de los parámetros, el valor por defecto de la biblioteca deja el entrenamiento en 69,6 en vez de 19,1, lo que cambia contra qué tiene que pelear el decaimiento. Se corrige en cuatro líneas.

**`Adam` no es `AdamW`.** `AdamW` resta el decaimiento al peso fuera de la actualización; `Adam` lo suma al gradiente, que es lo que hace microgpt. Con `AdamW` este entrenamiento no saltó nunca, con ningún decaimiento entre 0,002 y 0,5: la norma de los parámetros se quedaba entre 40 y 50 y el modelo seguía en la respuesta memorizada. Con el decaimiento dentro del gradiente funciona `wd = 0,0012`. La misma palabra, otro optimizador y otro entrenamiento.

## Reprodúcelo

Hace falta el SDK de .NET 10 o superior. La primera compilación descarga la biblioteca nativa de PyTorch, unos cientos de megabytes.

```bash
git clone https://github.com/jacano/grokking-torchsharp
cd grokking-torchsharp
dotnet run -c Release
```

El entrenamiento tarda unos treinta segundos y escribe tres cosas:

| Dónde | Qué |
| --- | --- |
| `data/train.txt`, `data/test.txt` | los dos conjuntos, un par por línea: 843 líneas y 1.966 líneas |
| `runs/grokking.csv` | los números registrados en cada paso |
| `figures/` | las gráficas de este artículo |

Cada fila del CSV tiene seis columnas:

| Columna | Significado |
| --- | --- |
| `step` | paso de entrenamiento |
| `train_loss` | entropía cruzada media sobre 512 pares de entrenamiento |
| `train_acc` | acierto exacto en esos pares |
| `test_loss` | entropía cruzada media sobre los 1.966 pares reservados |
| `test_acc` | acierto exacto en los pares reservados |
| `param_norm` | tamaño de todos los parámetros, como un solo número |

El repositorio trae un `Makefile`, así que los mismos comandos funcionan en un portátil y en un servidor de integración:

```bash
make run                                  # el entrenamiento de arriba
make control                              # el mismo, con el decaimiento a cero
make save                                 # entrenar y guardar el modelo
make explain PAIR=12+35                   # dibujar las 53 respuestas que considera
make run ARGS="--p 13 --steps 3000"       # un módulo más pequeño aprende antes
```

## Conclusiones

- **El acierto en entrenamiento es una mala guía.** Llega al 100 % mientras el de los pares reservados está en el azar, y ahí sigue durante dos mil pasos.
- **El *grokking* es una transición entre dos soluciones.** Una guarda las respuestas y necesita parámetros grandes; la otra calcula la regla y necesita menos. El entrenamiento se queda en la primera hasta que la segunda sale más barata.
- **El decaimiento de pesos elige entre las dos.** Quítalo y el entrenamiento no sale de la tabla, con ningún número de pasos.
- **Vigila el tamaño de los parámetros.** Es la señal más barata de en qué solución está un entrenamiento.

El código, los datos y los registros están en
[github.com/jacano/grokking-torchsharp](https://github.com/jacano/grokking-torchsharp).
