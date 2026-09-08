---
title: 'Realtime mobile object detector in Xamarin.Android'
date: '2019-07-04'
tag: 'Archive · Xamarin'
excerpt: 'How we built TailwindTraders AR with Xamarin.Android, EmguTF and TensorFlow Lite. SSD MobileNet, NV21 to RGB in native code, SkiaSharp and 7 fps on Pixel XL.'
read: '8 min'
---

> **Archive note:** This article was first published on **July 4, 2019** at [geeks.ms/xamarinteam](https://geeks.ms/xamarinteam/2019/07/04/realtime-mobile-object-detector-in-xamarin-android/) (Plain Concepts Xamarin Team). It is republished here from the [Wayback Machine archive 2024-05-18](https://web.archive.org/web/20240518135953/https://geeks.ms/xamarinteam/2019/07/04/realtime-mobile-object-detector-in-xamarin-android/). Original author: **Juan Antonio Cano**. Code at [github.com/jacano/CameraTF](https://github.com/jacano/CameraTF).

Last year the Xamarin team took part in [TailwindTraders](https://github.com/Microsoft/TailwindTraders-Mobile), a set of reference samples for Microsoft Build.

We were responsible for the Xamarin.Forms demos. We showed the main features of Forms, in particular Shell and more.

TailwindTraders is a fictitious DIY brand. It sells tools for work, gardening and more.

One part of the app was an AR experience. It took pictures from the rear camera of Android or iPhone in real time. It detected a product and showed details and purchase recommendations.

On Android we used the Xamarin Binding of [android.hardware.camera2](https://developer.android.com/reference/android/hardware/camera2/package-summary) to show the rear camera preview. We used a custom version of [EmguTF](https://github.com/emgucv/emgutf) to detect objects. We agreed to detect three objects to show characteristics and make recommendations.

We first agreed to detect three objects. As a demo we used one: a white hardhat.

This article presents a sample project [CameraTF](https://github.com/jacano/CameraTF) in Xamarin.Android. It uses the white hardhat detection model from TailwindTraders for a didactic purpose.

Let us begin.

## The model

The heart of the app is an offline deep learning model. We needed to prioritize inference speed over accuracy. The model must run on a mobile device. For that reason we chose [TensorFlow Lite](https://www.tensorflow.org/lite).

EmguTF is a C# binding for TensorFlow Lite. TensorFlow Lite is for Mobile and IoT. It is a C++ library that parses a serialized deep learning model from FlatBuffer. It runs inference with the [Interpreter](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/interpreter.h) class.

The .NET Standard project Emgu.TF.Lite is a simplified version of EmguTF. It exposes an Interpreter class in C#. You provide the input tensors of the model. You then get the output tensors.

We used an SSD MobileNet model. We did transfer learning over [ssd_mobilenet_v1_0.75_depth_300x300_coco14_sync_2018_07_03](http://download.tensorflow.org/models/object_detection/ssd_mobilenet_v1_0.75_depth_300x300_coco14_sync_2018_07_03.tar.gz). We used this [pipeline config](https://github.com/tensorflow/models/blob/master/research/object_detection/samples/configs/ssd_mobilenet_v1_0.75_depth_quantized_300x300_pets_sync.config) to train it on Google Cloud TPUs. The training was fast and easy.

For more on this process see this post: [Training and serving a realtime mobile object detector in 30 minutes with Cloud TPUs](https://medium.com/tensorflow/training-and-serving-a-realtime-mobile-object-detector-in-30-minutes-with-cloud-tpus-b78971cf1193).

After the dataset was ready and training finished, we got [hardhat_detect.tflite](https://github.com/jacano/CameraTF/blob/master/src/Resources/hardhat/hardhat_detect.tflite) and [hardhat_labels_list.txt](https://github.com/jacano/CameraTF/blob/master/src/Resources/hardhat/hardhat_labels_list.txt).

## Camera setup

In this sample we used Xamarin Binding for android.hardware.camera. This helps to understand camera setup code and to get each frame for processing.

CameraTF is an Android Activity. It shows a CameraSurfaceView with the rear camera preview. To get each frame we used [FastAndroidCamera](https://github.com/jamesathey/FastAndroidCamera).

On tested devices (Nokia 6.1, Google Pixel XL, LG G4), the [OnPreviewFrame](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraEventsListener.cs) callback of INonMarshalingPreviewCallback gave about 30 fps for analysis. The preview in [CameraSurfaceView](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/CameraSurfaceView.cs) stayed smooth.

The class [CameraController](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraController.cs) controls camera init. It sets the preview format to NV21. It sets fps range and resolution with SetPreviewFpsRange and SetPreviewSize.

One of the most important steps for real-time is to convert NV21 (YUV420sp) to RGB in native code.

For details see [YuvHelper](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Helpers/YuvHelper.cs) and [yuv2rgb.cc](https://github.com/jacano/CameraTF/tree/master/src/CameraTF/Libs/YUV).

## Image processing and inference

In [CameraAnalyzer](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraAnalyzer.cs) you can track the stages to generate the input tensor. Once we get the RGB frame, we scale it to the SSD MobileNet input size (300×300) and rotate it to fix camera orientation. All operations run with [SkiaSharp](https://github.com/mono/SkiaSharp) to use native image processing performance.

The last step is to set RGB colors in the input tensor. Then invoke the interpreter and get the output tensors. This model returns 4 output tensors as float arrays for each invocation.

- The first holds bounding boxes of detected entities.
- The second is an index to hardhat_labels_list.txt for the class.
- The third is the confidence percentage for each object.
- The fourth is the number of detected objects.

This was a screen recording from the app on a Pixel XL. It showed about 7 fps in the processingTask inside the CameraAnalyzer class. The image was a GIF from the original article and is not republished here.

The project is open for [PRs](https://github.com/jacano/CameraTF/pulls) and improvements. Feel free to collaborate and open issues.

---

*First published July 4, 2019 at geeks.ms/xamarinteam. Republished 2025 on jacano.dev via Wayback Machine. Tags: EmguTF, TailwindTraders, TensorFlow, Xamarin.Android*
