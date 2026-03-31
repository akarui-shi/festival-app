# API план

## Аутентификация
POST /api/auth/register  
POST /api/auth/login  

## Пользователь
GET /api/users/me  

## Мероприятия
GET /api/events  
GET /api/events/{id}  
POST /api/events  
PUT /api/events/{id}  
DELETE /api/events/{id}  

## Сеансы
GET /api/sessions  
POST /api/sessions  

## Регистрация
POST /api/registrations  
GET /api/registrations  

## Отзывы
POST /api/reviews  
GET /api/reviews/event/{id}  

## Избранное
POST /api/favorites  
GET /api/favorites  

## Публикации
POST /api/publications  
GET /api/publications  