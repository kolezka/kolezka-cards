FROM postgres:16-alpine

# Bake the role/db names into the image so the compose `environment:`
# block (which Coolify auto-mirrors to its env tab) only needs to carry
# the password. The values match resolveDatabaseUrl()'s defaults so the
# app can connect with just POSTGRES_PASSWORD set.
ENV POSTGRES_USER=kc \
    POSTGRES_DB=kc_cards
