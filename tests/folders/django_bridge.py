"""Adaptador de teste: API REST real com JWT, sem abrir porta HTTP.

Execute somente pelo real-api.mjs, em cópia do backend e SQLite descartável.
Não configura endpoints nem altera código do backend.
"""
import json
import os
import sys
from uuid import uuid4

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from core.models import Folder, Membership, User  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402

request = json.loads(sys.argv[1])
if request.get('action') == 'setup':
    users = {}
    for role in ('owner', 'admin', 'member', 'outsider'):
        user = User.objects.create_user(email=f'folders36-{uuid4().hex}-{role}@example.test', name=f'Teste {role}')
        users[role] = user.pk
    result = {'status': 200, 'data': users}
elif request.get('action') == 'memberships':
    for role in ('admin', 'member'):
        Membership.objects.create(project_id=request['project'], user_id=request['users'][role], role=role)
    result = {'status': 200, 'data': None}
elif request.get('action') == 'bulk':
    Folder.objects.bulk_create([
        Folder(project_id=request['project'], name=f'Volume {index:03}', created_by_id=request['actor'])
        for index in range(105)
    ])
    result = {'status': 200, 'data': None}
else:
    client = APIClient()
    if request.get('actor'):
        user = User.objects.get(pk=request['actor'])
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    response = client.generic(
        request['method'], request['path'],
        data=json.dumps(request.get('body', {})), content_type='application/json', HTTP_HOST='localhost',
    )
    result = {'status': response.status_code, 'data': getattr(response, 'data', None)}
print(json.dumps(result))
