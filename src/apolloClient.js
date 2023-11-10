// src/apolloClient.js
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000',  // replace with your Apollo server URI
  cache: new InMemoryCache()
});

export default client;
