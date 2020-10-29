# Brio Api

### Local Setup

```
cd api
npm ci
cp config/development.json.example config/development.json
npm start
```

## DevOps

Push to Heroku

```
git push heroku master
```

Reset DB on Heroku

```
heroku pg:reset -a brio-api
```

Migrate DB on Heroku

```
heroku run "npm run db:migrate --prefix api" -a brio-api
```

Seed DB

```
heroku run "npm run db:seed --prefix api" -a brio-api
```
