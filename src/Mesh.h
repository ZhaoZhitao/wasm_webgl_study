#ifndef Mesh_h
#define Mesh_h
namespace OceanoGL
{
    class Mesh
    {
    private:
        const void *_Vertices, *_Normals, *_Indexes;

    public:
        Mesh(const void *vertices, const void *normals, const void *indexes);
        ~Mesh();
    };
} // namespace OceanoGL

#endif