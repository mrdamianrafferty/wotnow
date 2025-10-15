import { getRegionalProducts } from '../lib/copernicus/regionRouterV2';

console.log('Salinity products for MED:');
const products = getRegionalProducts('MED', 'salinity');
console.log(JSON.stringify(products, null, 2));
