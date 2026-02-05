#!/bin/bash

# This script requests a TLS certificate for a given domain. It also updates the A record
# for this domain to point to the current IPv4 address of the local en0 interface.
#
# The goal is to make it easier to access a local Vite web development server from a virtual
# on a dynamic local DHCP address using a or real mobile device (Simulator, emulator, ...),
# without modifying the hostfile of said device, and without installing a custom
# TLS Certificate Authority (although Android's webview still seems to require one for ZeroSSL!).
#
# Initially written by ChatGPT, with some issues corrected.
# Dependencies:
# - a domain registered in Cloudflare.
# - openssl, dig, acme.sh, curl
# - .env file, see below

# acme.sh may be installed as an alias
shopt -s expand_aliases
if [ -f ~/.bashrc ]; then
  source ~/.bashrc
fi

# Load Cloudflare credentials
if [ -f .cloudflare.env ]; then
  source .cloudflare.env
elif [ -f "$HOME/.cloudflare.env" ]; then
  source "$HOME/.cloudflare.env"
else
  echo "Cloudflare credentials not found. Please create .cloudflare.env with DOMAIN, CF_API_TOKEN, CF_ACCOUNT_ID, CF_ZONE_ID, and CF_RECORD_ID."
  exit 1
fi

# Define env variables as used by acme.sh (https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh)
export CF_Token=$CF_API_TOKEN
export CF_Account_ID=$CF_ACCOUNT_ID
export CF_Zone_ID=$CF_ZONE_ID

# 1. Check if the domain has a valid TLS certificate

CERT_PATH="$HOME/.acme.sh/${DOMAIN}_ecc/${DOMAIN}.cer"
NEEDS_RENEWAL=0

if [ -f "$CERT_PATH" ]; then
  # Check expiry (in seconds)
  EXPIRE_DATE=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
  EXPIRE_SECS=$(date -j -f "%b %d %T %Y %Z" "$EXPIRE_DATE" "+%s" 2>/dev/null || date -d "$EXPIRE_DATE" "+%s")
  NOW_SECS=$(date "+%s")
  DAYS_LEFT=$(( (EXPIRE_SECS - NOW_SECS) / 86400 ))
  if [ $DAYS_LEFT -lt 7 ]; then
    echo "Certificate for $DOMAIN expires in $DAYS_LEFT days. Will renew."
    NEEDS_RENEWAL=1
  else
    # Check if cert is valid for the domain
    openssl x509 -in "$CERT_PATH" -noout -text | grep -q "DNS:$DOMAIN"
    if [ $? -ne 0 ]; then
      echo "Certificate does not match $DOMAIN. Will renew."
      NEEDS_RENEWAL=1
    else
      echo "Certificate for $DOMAIN is valid and has $DAYS_LEFT days left."
    fi
  fi
else
  echo "No certificate found for $DOMAIN. Will issue."
  NEEDS_RENEWAL=1
fi

# 2. Issue or renew certificate if needed
if [ $NEEDS_RENEWAL -eq 1 ]; then
  if command -v acme.sh >/dev/null 2>&1; then
    acme.sh --issue --dns dns_cf -d "$DOMAIN"
    if [ $? -ne 0 ]; then
      echo "acme.sh failed to issue/renew certificate for $DOMAIN"
      exit 1
    fi
  else
    echo "acme.sh not found in PATH. Please install acme.sh."
    exit 1
  fi
fi

# 3. Get current local network IP address (en0 is typical for Wi-Fi)
IP=$(ipconfig getifaddr en0)
if [ -z "$IP" ]; then
  IP=$(ipconfig getifaddr en1)
fi
if [ -z "$IP" ]; then
  echo "Could not determine local IP address."
  exit 1
fi

# 4. Get current DNS A record for the domain
CURRENT_DNS_IP=$(dig @1.1.1.1 +short "$DOMAIN")

if [ "$CURRENT_DNS_IP" == "$IP" ]; then
  echo "DNS A record for $DOMAIN already matches local IP ($IP). No update needed."
  exit 0
fi

echo "Updating $DOMAIN to $IP (was $CURRENT_DNS_IP)"

# 5. Update Cloudflare DNS record
RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$CF_RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$IP\",\"ttl\":1,\"proxied\":false}")

echo "$RESPONSE"
