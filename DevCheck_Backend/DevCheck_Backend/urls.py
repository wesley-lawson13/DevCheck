from django.contrib import admin
from django.urls import include, path

from checklists.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('checklists/user/register/', CreateUserView.as_view(), name='user-register'),
    path('checklists/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('checklists/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('checklists-auth/', include('rest_framework.urls')),
    path('checklists/', include('checklists.urls')),
]
