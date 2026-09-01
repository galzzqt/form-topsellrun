import dns from "dns";
import { MongoClient } from "mongodb";

// Some Windows setups misreport the system DNS server to Node's resolver,
// which breaks the SRV lookup required by mongodb+srv:// URIs (ECONNREFUSED
// on querySrv even though the OS resolver works fine). Force known-good
// public resolvers so the SRV/TXT lookup doesn't depend on that.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI env var");

// ponytail: global cached client, single-process dev/serverless pattern per Next.js docs
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
