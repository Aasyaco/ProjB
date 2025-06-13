#include <napi.h>
#include <string>
#include <unordered_set>
#include <sstream>

bool isBlocked(const std::string& key, const std::string& blockRaw) {
    std::unordered_set<std::string> blockSet;
    std::istringstream ss(blockRaw);
    std::string line;
    while (std::getline(ss, line)) {
        blockSet.insert(line);
    }
    return blockSet.find(key) != blockSet.end();
}

Napi::Boolean IsBlockedWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    std::string key = info[0].As<Napi::String>().Utf8Value();
    std::string blockRaw = info[1].As<Napi::String>().Utf8Value();

    bool blocked = isBlocked(key, blockRaw);
    return Napi::Boolean::New(env, blocked);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("isBlocked", Napi::Function::New(env, IsBlockedWrapped));
    return exports;
}

NODE_API_MODULE(addon, Init)
