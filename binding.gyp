{
  "targets": [
    {
      "target_name": "portaudio",
      "sources": [
        "src/portaudio.cc",
        "src/GetDevices.cc",
        "src/AudioIn.cc",
        "src/common.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "portaudio/include"
      ],
      "conditions" : [
        [
          'OS=="mac"', {
            'xcode_settings': {
              'GCC_ENABLE_CPP_RTTI': 'YES',
              'MACOSX_DEPLOYMENT_TARGET': '10.7',
              'OTHER_CPLUSPLUSFLAGS': [
                '-std=c++14',
                '-stdlib=libc++',
                '-fexceptions'
              ],
              'OTHER_LDFLAGS': [
                "-Wl,-rpath,@loader_path/"
              ]
            },
            "link_settings": {
              "libraries": [
                "<(module_root_dir)/build/Release/libportaudio.dylib"
              ]
            },
            "copies": [
              {
                "destination": "<(module_root_dir)/build/Release/",
                "files": [
                  "<(module_root_dir)/portaudio/bin/libportaudio.dylib"
                ]
              }
            ]
          },
        ],
        [
          'OS=="win"', {
            "configurations": {
              "Release": {
                "msvs_settings": {
                  "VCCLCompilerTool": {
                    "RuntimeTypeInfo": "true",
                    "ExceptionHandling": 1
                  }
                }
              }
            },
            "libraries": [
               "<(module_root_dir)/portaudio/bin/portaudio_x64.lib"
            ],
            "copies": [
              {
                "destination": "<(module_root_dir)/build/Release",
                "files": [
                  "<(module_root_dir)/portaudio/bin/portaudio_x64.dll",
                  "<(module_root_dir)/portaudio/bin/vcruntime140.dll"
                ]
              }
            ]
          },
        ],
        [
          'OS=="linux"', {
            "conditions": [
              ['target_arch=="arm"', {
                "link_settings": {
                  "libraries": [
                    "<(module_root_dir)/build/Release/libportaudio.so.2"
                  ],
                  "ldflags": [
                    "-L<(module_root_dir)/build/Release",
                    "-Wl,-rpath,<(module_root_dir)/build/Release"
                  ]
                },
                "copies": [
                  {
                    "destination": "build/Release/",
                    "files": [
                      "<(module_root_dir)/portaudio/bin_armhf/libportaudio.so.2"
                    ]
                  }
                ]
              },
              {
                "link_settings": {
                  "libraries": [
                    "<(module_root_dir)/build/Release/libportaudio.so.2"
                  ],
                  "ldflags": [
                    "-L<(module_root_dir)/build/Release",
                    "-Wl,-rpath,'$$ORIGIN/'"
                  ]
                },
                "copies": [
                  {
                    "destination": "build/Release/",
                    "files": [
                      "<(module_root_dir)/portaudio/bin/libportaudio.so.2"
                    ]
                  }
                ]
              }]
            ]
          }
        ]
      ]
    }
  ]
}
