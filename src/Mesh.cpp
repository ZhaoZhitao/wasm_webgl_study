#include "Mesh.h"
namespace OceanoGL
{
    Mesh::Mesh(std::string name, const void *vertices, const void *normals, const void *indexes)
    {
        Name = name;
        _Vertices = vertices;
        _Normals = normals;
        _Indexes = indexes;
    }

    Mesh::~Mesh()
    {
        delete _Vertices;
        delete _Normals;
        delete _Indexes;
    }

} // namespace OceanoGL
