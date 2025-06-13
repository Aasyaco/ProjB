{
  "targets": [
    {
      "target_name": "addon",
      "sources": [ "addon.cpp" ],
      "cflags_cc": [ "-std=c++23" ],
      "conditions": [
        [ 'OS=="win"', {
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
