#ifndef Mesh_h
#define Mesh_h
#include <string>
namespace OceanoGL
{
    class Mesh
    {
    private:
        const void *_Vertices, *_Normals, *_Indexes;

    public:
        Mesh(std::string name, const void *vertices, const void *normals, const void *indexes);
        ~Mesh();
        std::string Name;
    };
} // namespace OceanoGL

#endif