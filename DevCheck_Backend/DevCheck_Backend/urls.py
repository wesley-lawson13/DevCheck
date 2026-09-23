from django.contrib import admin
from django.urls import include, path

from checklists.views import CreateUserView, UserDetailView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('checklists/user/register/', CreateUserView.as_view(), name='user-register'),
    path('checklists/user/', UserDetailView.as_view(), name='user-detail'),
    path('checklists/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('checklists/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('checklists/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('checklists-auth/', include('rest_framework.urls')),
    path('checklists/', include('checklists.urls')),
]

# Serve uploaded media from ./media in local development only.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
