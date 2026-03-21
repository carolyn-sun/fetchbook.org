# fetchbook.org

fetchbook.org is where we share our `fastfetch` outputs. `fastfetch` is a CLI tool that displays system information. Its repository is located at [fastfetch-cli/fastfetch](https://github.com/fastfetch-cli/fastfetch).

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the root directory:

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
JWT_SECRET=any_random_secure_long_string
```

### 3. Initialize the D1 Database

Initialize the database schema for the local environment:

```bash
npx wrangler d1 execute fetchbook-db --local --file=./schema.sql
```

### 4. Start the Dev Server

```bash
npm run dev
```

The server will boot up interactively (typically at `http://localhost:8787`).

## Contributing

Pre-commit hooks are natively enforced via Husky and Biome for strict formatting and syntactical safety. Be sure to test changes via `npm run lint` and `npm run build` prior to committing.
