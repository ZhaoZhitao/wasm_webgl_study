#include "OrthographicCamera.h"

namespace OceanoGL
{
    OrthographicCamera::OrthographicCamera(/* args */)
    {
    }

    OrthographicCamera::~OrthographicCamera()
    {
    }

    Matrix4 OrthographicCamera::GetMatrix()
    {
        Matrix4 m;
        Orthographic(&m, Left, Right, Bottom, Top, NearZ, FarZ);
        return m;
    }
} // namespace OceanoGL
