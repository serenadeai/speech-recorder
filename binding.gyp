{
    "targets": [
        {
            "target_name": "speechrecorder",
            "sources": ["src/speech_recorder.cpp"],
            "cflags!": [
                "-fno-exceptions",
                "-fno-rtti",
            ],
            "cflags_cc!": [
                "-fno-exceptions",
                "-fno-rtti",
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "<(module_root_dir)/include",
                "<(module_root_dir)/lib/include",
                "<(module_root_dir)/lib/build/_deps/drwav-src",
                "<(module_root_dir)/lib/build/_deps/readerwriterqueue-src",
                "<(module_root_dir)/lib/3rd_party/webrtcvad",
                "<(module_root_dir)/lib/3rd_party/portaudio/include",
                "<(module_root_dir)/lib/3rd_party/onnxruntime/include",
            ],
            "defines": [
                "NAPI_VERSION=<(napi_build_version)",
                "NAPI_CPP_EXCEPTIONS",
            ],
            "conditions": [
                [
                    'OS=="mac"',
                    {
                        "xcode_settings": {
                            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                            "GCC_ENABLE_CPP_RTTI": "YES",
                            "MACOSX_DEPLOYMENT_TARGET": "10.14",
                            "OTHER_LDFLAGS": ["-Wl,-rpath,@loader_path/"],
                        },
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/lib/build/libspeechrecorder.dylib",
                                    "<(module_root_dir)/lib/3rd_party/portaudio/lib/libportaudio.dylib",
                                    "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/libonnxruntime.1.10.0.dylib",
                                ],
                            }
                        ],
                        "libraries": [
                            "<(module_root_dir)/build/Release/libspeechrecorder.dylib",
                            "<(module_root_dir)/build/Release/libportaudio.dylib",
                            "<(module_root_dir)/build/Release/libonnxruntime.1.10.0.dylib",
                        ],
                    },
                    'OS=="win"',
                    {
                        "msvs_settings": {
                            "VCCLCompilerTool": {
                                "ExceptionHandling": 1,
                            },
                        },
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/lib/build/Release/speechrecorder.dll",
                                    "<(module_root_dir)/lib/3rd_party/portaudio/bin/portaudio_x86.dll",
                                    "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/onnxruntime.dll",
                                    "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/onnxruntime_providers_shared.dll",
                                    "<(module_root_dir)/lib/3rd_party/vcruntime/vcruntime140.dll",
                                ],
                            }
                        ],
                        "libraries": [
                            "<(module_root_dir)/lib/build/Release/speechrecorder.lib",
                            "<(module_root_dir)/lib/3rd_party/portaudio/lib/portaudio_x86.lib",
                            "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/onnxruntime.lib",
                            "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/onnxruntime_providers_shared.lib",
                        ],
                    },
                    'OS=="linux"',
                    {
                        "link_settings": {"ldflags": ["-Wl,-rpath,'$$ORIGIN/'"]},
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/lib/build/libspeechrecorder.so",
                                    "<(module_root_dir)/lib/3rd_party/portaudio/lib/libportaudio.so",
                                    "<(module_root_dir)/lib/3rd_party/onnxruntime/lib/libonnxruntime.so.1.10.0",
                                ],
                            }
                        ],
                        "libraries": [
                            "<(module_root_dir)/build/Release/libspeechrecorder.so",
                            "<(module_root_dir)/build/Release/libportaudio.so",
                            "<(module_root_dir)/build/Release/libonnxruntime.so.1.10.0",
                        ],
                    },
                ],
            ],
        }
    ]
}
