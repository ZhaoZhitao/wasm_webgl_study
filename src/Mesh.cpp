#include "Mesh.h"
namespace OceanoGL
{
    Mesh::Mesh(const void *vertices, const void *normals, const void *indexes)
    {
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
