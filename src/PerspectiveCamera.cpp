#include "PerspectiveCamera.h"

namespace OceanoGL
{
    PerspectiveCamera::PerspectiveCamera(/* args */)
    {
    }

    PerspectiveCamera::~PerspectiveCamera()
    {
    }
    Matrix4 PerspectiveCamera::GetMatrix()
    {
        Matrix4 m;
        Perspective(&m, FovY, Aspect, NearZ, FarZ);
        return m;
    }

} // namespace OceanoGL
