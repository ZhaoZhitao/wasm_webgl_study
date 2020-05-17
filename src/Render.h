#ifndef Render_h
#define Render_h
#include "Mesh.h"

namespace OceanoGL
{
    class Render
    {
    private:
        /* data */
    public:
        Render(/* args */);
        ~Render();
        void Add(Mesh *mesh);
    };
} // namespace OceanoGL

#endif