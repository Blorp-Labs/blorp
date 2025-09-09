ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

# Enable Yarn Berry
RUN corepack enable && corepack prepare yarn@stable --activate

# Install deps
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable --frozen-lockfile

# Build app (inject build‑time args if you like)
COPY . .
ARG REACT_APP_NAME
ARG REACT_APP_DEFAULT_INSTANCE
ARG REACT_APP_LOCK_TO_DEFAULT_INSTANCE
ARG REACT_APP_INSTANCE_SELECTION_MODE
ENV \
  REACT_APP_NAME=$REACT_APP_NAME \
  REACT_APP_DEFAULT_INSTANCE=$REACT_APP_DEFAULT_INSTANCE \
  REACT_APP_LOCK_TO_DEFAULT_INSTANCE=$REACT_APP_LOCK_TO_DEFAULT_INSTANCE \
  REACT_APP_INSTANCE_SELECTION_MODE=$REACT_APP_INSTANCE_SELECTION_MODE
RUN yarn build \
 && rm -rf dist/*.map

# ─── Runtime stage ───────────────────────────
FROM nginx:alpine AS runtime

# install envsubst
RUN apk add --no-cache gettext

# copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# rename the real index.html so we can template it
RUN mv /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.tmpl

# write our custom nginx config (all routes → index.html)
RUN printf '%s\n' \
  'server {' \
  '    listen       80;' \
  '    server_name  _;' \
  '' \
  '    root   /usr/share/nginx/html;' \
  '    index  index.html;' \
  '' \
  '    # React Router support: serve index.html for any path' \
  '    location / {' \
  '        try_files $uri $uri/ /index.html;' \
  '    }' \
  '' \
  '    # long‑term caching for static assets' \
  '    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico)$ {' \
  '        expires 1y;' \
  '        add_header Cache-Control "public, immutable";' \
  '    }' \
  '' \
  '    error_page  500 502 503 504  /50x.html;' \
  '    location = /50x.html {' \
  '        root   /usr/share/nginx/html;' \
  '    }' \
  '}' \
> /etc/nginx/conf.d/default.conf

# embed entrypoint script via heredoc
RUN cat << 'EOF' > /usr/local/bin/docker-entrypoint.sh
#!/bin/sh
set -e

# assemble a small JS snippet from runtime ENV
cat << JS > /tmp/env-block.js
window.REACT_APP_DEFAULT_INSTANCE = "${REACT_APP_DEFAULT_INSTANCE}";
window.REACT_APP_NAME             = "${REACT_APP_NAME}";
window.REACT_APP_LOCK_TO_DEFAULT_INSTANCE = "${REACT_APP_LOCK_TO_DEFAULT_INSTANCE}";
window.REACT_APP_INSTANCE_SELECTION_MODE = "${REACT_APP_INSTANCE_SELECTION_MODE}";
JS

# merge template → final index.html, splicing in our JS snippet
envsubst '$REACT_APP_DEFAULT_INSTANCE $REACT_APP_NAME $REACT_APP_LOCK_TO_DEFAULT_INSTANCE $REACT_APP_INSTANCE_SELECTION_MODE' \
  < /usr/share/nginx/html/index.html.tmpl \
  | sed -e '/REPLACE_ENV_VARS/ {
      r /tmp/env-block.js
      d
    }' \
  > /usr/share/nginx/html/index.html

# hand off to nginx
exec "$@"
EOF
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
