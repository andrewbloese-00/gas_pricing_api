# Gas Price API 

A simple NodeJS API for fetching gas prices based on a provided zipcode and optional fuel type. 

## Get Gas Prices

GET `[BASE_URL]`/gas_prices?zipcode=`<zip>`&fuel=`<1|2|3>
`
### Parameters
> **`zipcode`** - a string representing the users desired zipcode 
> - *required*

> **`fuel`** - select a fuel type on GasBuddy
> - *optional*


#### About Fuel Types
|Fuel Type|Represents|
|---|---|
| 1 | Regular |
| 2 | Midgrade |
| 3 | Premium |

### Response
The API may respond with the following JSON structures: 
#### Success
```json
{
    "prices": string[],
    "min": number,
    "max": number,
    "average": number
}
```

#### Error
```json
{
    "error": string
}
```