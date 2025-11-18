from django.contrib import admin
from django.urls import include, path

from checklists.views import CreateUserView, UserDetailView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# For development ONLY
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('checklists/user/register/', CreateUserView.as_view(), name='user-register'),
    path('checklists/user/', UserDetailView.as_view(), name='user-detail'),
    path('checklists/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('checklists/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('checklists-auth/', include('rest_framework.urls')),
    path('checklists/', include('checklists.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
