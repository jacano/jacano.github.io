---
title: 'Realtime mobile object detector in Xamarin.Android'
date: '2019-07-04'
tag: 'Archive · Xamarin'
excerpt: 'How we built TailwindTraders AR with Xamarin.Android, EmguTF and TensorFlow Lite. SSD MobileNet, NV21 to RGB in native code, SkiaSharp and 7 fps on Pixel XL.'
read: '3 min'
---

> **Archive note:** This article was first published on **July 4, 2019** at [geeks.ms/xamarinteam](https://geeks.ms/xamarinteam/2019/07/04/realtime-mobile-object-detector-in-xamarin-android/) (Plain Concepts Xamarin Team). It is republished here from the [Wayback Machine archive 2024-05-18](https://web.archive.org/web/20240518135953/https://geeks.ms/xamarinteam/2019/07/04/realtime-mobile-object-detector-in-xamarin-android/). Original author: **Juan Antonio Cano**. Code at [github.com/jacano/CameraTF](https://github.com/jacano/CameraTF).

In 2019 the Plain Concepts Xamarin team joined [TailwindTraders](https://github.com/Microsoft/TailwindTraders-Mobile), a set of reference samples for Microsoft Build.

We built the Xamarin.Forms demos. We showed the main features of Forms, and Shell in particular.

TailwindTraders is a fictitious DIY brand. It sells tools for work, gardening and more.

One part of the app was an AR experience. It read the rear camera of the phone in real time. It detected a product and showed the details and a purchase suggestion.

On Android we used the Xamarin Binding of [android.hardware.camera2](https://developer.android.com/reference/android/hardware/camera2/package-summary) for the preview, and a custom version of [EmguTF](https://github.com/emgucv/emgutf) to detect the objects.

We agreed on three objects. The demo used one: a white hardhat.

This article presents [CameraTF](https://github.com/jacano/CameraTF), a Xamarin.Android sample that uses the white hardhat model from TailwindTraders.

---

## The model

The app runs an offline model. On a phone, speed matters more than accuracy, so we chose [TensorFlow Lite](https://www.tensorflow.org/lite).

EmguTF is a C# binding for TensorFlow Lite, the C++ library for mobile and IoT. It reads a serialized model from FlatBuffer and runs the inference with the [Interpreter](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/interpreter.h) class.

The .NET Standard project `Emgu.TF.Lite` is a small version of EmguTF. You give it the input tensors, and it gives you the output tensors.

For the model we used SSD MobileNet and did transfer learning over [ssd_mobilenet_v1_0.75_depth_300x300_coco14_sync_2018_07_03](http://download.tensorflow.org/models/object_detection/ssd_mobilenet_v1_0.75_depth_300x300_coco14_sync_2018_07_03.tar.gz). We trained it on Google Cloud TPUs with this [pipeline config](https://github.com/tensorflow/models/blob/master/research/object_detection/samples/configs/ssd_mobilenet_v1_0.75_depth_quantized_300x300_pets_sync.config). The whole process is described in [this post](https://medium.com/tensorflow/training-and-serving-a-realtime-mobile-object-detector-in-30-minutes-with-cloud-tpus-b78971cf1193).

At the end we had two files: [hardhat_detect.tflite](https://github.com/jacano/CameraTF/blob/master/src/Resources/hardhat/hardhat_detect.tflite) and [hardhat_labels_list.txt](https://github.com/jacano/CameraTF/blob/master/src/Resources/hardhat/hardhat_labels_list.txt).

---

## Camera setup

The sample uses the Xamarin Binding for android.hardware.camera. That keeps the camera code short and gives us one frame at a time.

CameraTF is an Android Activity. It shows a CameraSurfaceView with the preview. We used [FastAndroidCamera](https://github.com/jamesathey/FastAndroidCamera) to get each frame.

On the devices we tested (Nokia 6.1, Google Pixel XL, LG G4), the [OnPreviewFrame](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraEventsListener.cs) callback gave about 30 fps, and the preview in [CameraSurfaceView](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/CameraSurfaceView.cs) stayed smooth.

[CameraController](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraController.cs) sets the preview format to NV21, and the fps range and the resolution with SetPreviewFpsRange and SetPreviewSize.

The step that makes real time possible is one: convert NV21 (YUV420sp) to RGB in native code. See [YuvHelper](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Helpers/YuvHelper.cs) and [yuv2rgb.cc](https://github.com/jacano/CameraTF/tree/master/src/CameraTF/Libs/YUV).

---

## From pixels to a detection

[CameraAnalyzer](https://github.com/jacano/CameraTF/blob/master/src/CameraTF/Camera/CameraAnalyzer.cs) runs the stages. From the RGB frame, it scales to the model input (300×300) and rotates to fix the camera orientation. [SkiaSharp](https://github.com/mono/SkiaSharp) does the image work at native speed.

Then it fills the input tensor, calls the interpreter and reads four output tensors:

- the bounding boxes of the detected objects,
- the class index into hardhat_labels_list.txt,
- the confidence of each object,
- the number of objects.

A screen recording on a Pixel XL showed about 7 fps in the processing task inside CameraAnalyzer.

The project is open for [pull requests](https://github.com/jacano/CameraTF/pulls) and issues.

---

*First published July 4, 2019 at geeks.ms/xamarinteam. Republished 2025 on jacano.dev via Wayback Machine. Tags: EmguTF, TailwindTraders, TensorFlow, Xamarin.Android*
