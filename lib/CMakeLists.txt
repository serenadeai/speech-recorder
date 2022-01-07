cmake_minimum_required(VERSION 3.15)
project(speechrecorder)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)
set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)
include(FetchContent)

option(BUILD_SHARED_LIBS "Build using shared libraries" ON)

if(WIN32)
    add_compile_options(
        -DWEBRTC_WIN
    )
else()
    add_compile_options(
        -DWEBRTC_POSIX
    )
endif()

set(FETCHCONTENT_UPDATES_DISCONNECTED ON)

FetchContent_Declare(drwav
  GIT_REPOSITORY https://github.com/mackron/dr_libs
  GIT_TAG 9497270f581f43e6b795ce5d98d8764861fb6a50
)

FetchContent_Declare(readerwriterqueue
  GIT_REPOSITORY https://github.com/cameron314/readerwriterqueue
  GIT_TAG v1.0.6
)

FetchContent_MakeAvailable(drwav readerwriterqueue)

include_directories(
    include
    3rd_party/webrtcvad
    3rd_party/portaudio/include
    3rd_party/onnxruntime/include
)

link_directories(
    ${CMAKE_SOURCE_DIR}/3rd_party/portaudio/lib
    ${CMAKE_SOURCE_DIR}/3rd_party/onnxruntime/lib
)

file(GLOB_RECURSE SOURCES
    src/*.cpp
    3rd_party/webrtcvad/*.c
    3rd_party/webrtcvad/*.cc
)

set(LIBRARIES
    readerwriterqueue
)

if(APPLE)
    list(APPEND LIBRARIES
        "-framework AudioToolbox"
        "-framework AudioUnit"
        "-framework CoreAudio"
        "-framework CoreFoundation"
        "-framework CoreServices"
        portaudio
        onnxruntime.1.10.0
    )
elseif(WIN32)
    list(APPEND LIBRARIES
        portaudio_x86
        onnxruntime
    )
else()
    list(APPEND LIBRARIES
        portaudio
        onnxruntime
        pthread
    )
endif()

add_library(speechrecorder ${SOURCES})
target_link_libraries(speechrecorder ${LIBRARIES})

add_executable(main test/main.cpp)
target_link_libraries(main speechrecorder)

if(WIN32)
    add_custom_command(TARGET main POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${PROJECT_SOURCE_DIR}/3rd_party/onnxruntime/lib/onnxruntime.dll"
            $<TARGET_FILE_DIR:main>

        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${PROJECT_SOURCE_DIR}/3rd_party/onnxruntime/lib/onnxruntime_providers_shared.dll"
            $<TARGET_FILE_DIR:main>

        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${PROJECT_SOURCE_DIR}/3rd_party/portaudio/bin/portaudio_x86.dll"
            $<TARGET_FILE_DIR:main>
    )
endif()
