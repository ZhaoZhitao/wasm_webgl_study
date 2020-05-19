#ifndef Scene_h
#define Scene_h
#include <map>
#include <string>
#include "Mesh.h"
#include "Light.h"
namespace OceanoGL
{
    class Scene
    {
    private:
        /* data */
        // std::map<
        std::map<std::string, Mesh *> _Meshes;
        std::map<std::string, Light *> _Lights;

    public:
        Scene(/* args */);
        ~Scene();
        void Add(std::string key, Mesh *mesh);
        void Remove(std::string key);
        void AddLight(std::string key, Light *light);
        void RemoveLight(std::string key);
        std::map<std::string, Mesh *> *GetMeshes();
        std::map<std::string, Light *> *GetLights();
    };
} // namespace OceanoGL

#endif