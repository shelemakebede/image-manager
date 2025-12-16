FROM node:18

WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
