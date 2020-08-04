from django.urls import path
from django.urls import re_path
from .views import MapdataView, ShopView, ExcelFormView, CompetitorsShopsView, ShopImageView


app_name = "MapData"

urlpatterns = [
    path('homes/', MapdataView.as_view()),
    path('homes/<str:city>/', MapdataView.as_view()),
]
