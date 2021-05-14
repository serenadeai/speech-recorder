{
    "targets": [
        {
            "target_name": "portaudio",
            "sources": [
                "src/portaudio.cc",
                "src/GetDevices.cc",
                "src/AudioIn.cc",
                "src/common.cc",
            ],
            "include_dirs": ["<!(node -e \"require('nan')\")", "portaudio/include"],
            "conditions": [
                [
                    'OS=="mac"',
                    {
                        "xcode_settings": {
                            "GCC_ENABLE_CPP_RTTI": "YES",
                            "MACOSX_DEPLOYMENT_TARGET": "10.7",
                            "OTHER_CPLUSPLUSFLAGS": [
                                "-std=c++14",
                                "-stdlib=libc++",
                                "-fexceptions",
                            ],
                            "OTHER_LDFLAGS": ["-Wl,-rpath,@loader_path/"],
                        },
                        "libraries": [
                            "<(module_root_dir)/build/Release/libportaudio.dylib",
                        ],
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/portaudio/lib/mac/libportaudio.dylib",
                                ],
                            }
                        ],
                    },
                ],
                [
                    'OS=="win"',
                    {
                        "configurations": {
                            "Release": {
                                "msvs_settings": {
                                    "VCCLCompilerTool": {
                                        "RuntimeTypeInfo": "true",
                                        "ExceptionHandling": 1,
                                    }
                                }
                            }
                        },
                        "libraries": [
                            "<(module_root_dir)/portaudio/lib/windows/libportaudio.dll.a"
                        ],
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/portaudio/lib/windows/vcruntime140.dll",
                                    "<(module_root_dir)/portaudio/lib/windows/libportaudio-2.dll",
                                ],
                            }
                        ],
                    },
                ],
                [
                    'OS=="linux"',
                    {
                        "link_settings": {
                            "ldflags": [
                                "-Wl,-rpath,'$$ORIGIN/'"
                            ]
                        },
                        "libraries": [
                            "<(module_root_dir)/build/Release/libportaudio.so.2",
                        ],
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release",
                                "files": [
                                    "<(module_root_dir)/portaudio/lib/linux/libportaudio.so.2",
                                ],
                            }
                        ],
                    },
                ],
            ],
        }
    ]
}
