# Описание базы данных

## Основные сущности

User
- id
- login
- email
- phone
- password_hash
- first_name
- last_name
- avatar_url
- created_at
- status

Role
- id
- name

UserRole
- user_id
- role_id

Organizer
- id
- user_id
- name
- description
- contacts

Event
- id
- title
- short_description
- full_description
- age_rating
- created_at
- status
- organizer_id

Category
- id
- name
- description

EventCategory
- event_id
- category_id

City
- id
- name
- region
- country

Venue
- id
- name
- address
- latitude
- longitude
- capacity
- city_id

Session
- id
- event_id
- venue_id
- start_time
- end_time

Registration
- id
- user_id
- session_id
- participants_count
- status
- qr_token

Review
- id
- user_id
- event_id
- rating
- text
- created_at

Favorite
- id
- user_id
- event_id

Publication
- id
- title
- content
- status
- created_at
- author_id