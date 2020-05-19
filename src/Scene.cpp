#include "Scene.h"
namespace OceanoGL
{
    Scene::Scene(/* args */)
    {
    }

    Scene::~Scene()
    {
    }

    void Scene::Add(std::string key, Mesh *mesh)
    {
        if (_Meshes.find(key) == _Meshes.end())
        {
            _Meshes.insert(std::map<std::string, Mesh *>::value_type(key, mesh));
        }
        else
        {
            _Meshes[key] = mesh;
        }
    }

    void Scene::Remove(std::string key)
    {
        _Meshes.erase(key);
    }

    void Scene::AddLight(std::string key, Light *light)
    {
        if (_Lights.find(key) == _Lights.end())
        {
            _Lights.insert(std::map<std::string, Light *>::value_type(key, light));
        }
        else
        {
            _Lights[key] = light;
        }
    }

    void Scene::RemoveLight(std::string key)
    {
        _Lights.erase(key);
    }

} // namespace OceanoGL
