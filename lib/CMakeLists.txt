cmake_minimum_required(VERSION 3.15)
project(speechrecorder)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)
set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS ON)

if(APPLE OR NOT WIN32)
    set(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)
endif()

if(APPLE)
    set(MACOSX_RPATH TRUE)
elseif(NOT WIN32)
    set(CMAKE_INSTALL_RPATH "$ORIGIN/")
endif()

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

include(FetchContent)
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
        onnxruntime
    )
elseif(WIN32)
    list(APPEND LIBRARIES
        onnxruntime
    )

    if("${CMAKE_GENERATOR_PLATFORM}" STREQUAL "Win32")
        list(APPEND LIBRARIES
            portaudio_x86
        )
    else()
        list(APPEND LIBRARIES
            portaudio_x64
        )
    endif()
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

install(TARGETS speechrecorder DESTINATION lib)
if (WIN32)
    install(
        FILES
            3rd_party/onnxruntime/lib/onnxruntime.dll
            3rd_party/onnxruntime/lib/onnxruntime_providers_shared.dll
        DESTINATION lib
    )
    if("${CMAKE_GENERATOR_PLATFORM}" STREQUAL "Win32")
        install(FILES 3rd_party/portaudio/bin/portaudio_x86.dll DESTINATION lib)
    else()
        install(FILES 3rd_party/portaudio/bin/portaudio_x64.dll DESTINATION lib)
    endif()
elseif(APPLE)
    install(
        FILES
            3rd_party/onnxruntime/lib/libonnxruntime.dylib
            3rd_party/onnxruntime/lib/libonnxruntime.1.10.0.dylib
            3rd_party/portaudio/lib/libportaudio.dylib
        DESTINATION lib
    )
else()
    install(
        FILES
            3rd_party/onnxruntime/lib/libonnxruntime.so
            3rd_party/onnxruntime/lib/libonnxruntime.so.1.10.0
            3rd_party/portaudio/lib/libportaudio.so
        DESTINATION lib
    )
endif()
