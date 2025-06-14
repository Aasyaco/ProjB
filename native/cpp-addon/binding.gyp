{
  "targets": [
    {
      "target_name": "addon",
      "sources": [ "addon.cpp" ],
      "cflags_cc": [ "-std=c++23" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        [ "OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "LanguageStandard": "stdcpp23"
            }
          }
        }]
      ]
    }
  ]
}
