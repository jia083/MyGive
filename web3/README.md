

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your private key
# NEVER commit your .env file!
```

### Configuration

Edit `.env` file:

```env
PRIVATE_KEY=your_wallet_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

## Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Start Local Blockchain

```bash
npm run node
```

Keep this running in a separate terminal for local development.

## Deployment

### Deploy to Local Network

```bash
npm run deploy:local
```

### Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

Deployment information will be saved to `deployments/<network>-latest.json`
