# Minecraft Live Mining Game

YouTube Live эсвэл TikTok LIVE-ийн interaction-ийг Minecraft маягийн mining game-тэй холбох vertical stream overlay.

## Одоогийн game

- 8 block өргөн mining талбайтай.
- Зүүн болон баруун захад тус бүр 1 Bedrock block байна.
- Дунд 6 block нь mine хийх боломжтой.
- Энгийн block хоёр цохилтоор эвдэрнэ.
- Эхний цохилтоор Minecraft маягийн crack animation гарна.
- Bedrock эвдрэхгүй, TNT болон pickaxe нэвтлэхгүй.
- Дээд block эвдрээгүй байхад доорх block цохилт авахгүй.
- Доошоо mine хийх үед хоёр захын Bedrock хана дэлгэцэнд тогтмол харагдана.
- Одоогоор pickaxe, TNT, mega pickaxe event-үүдийг дотоод timer үүсгэж байна.

## Ажиллуулах

Dependencies суулгах:

```bash
npm install
```

Development mode:

```bash
npm run dev
```

Browser дээр `http://localhost:3000` нээнэ. Хэрэв 3000 port эзэлсэн байвал Next.js өөр port, жишээ нь `http://localhost:3001`, ашиглана.

Production build шалгах:

```bash
npm run build
npm run start
```

## OBS дээр stream хийх

1. Game-ээ local server дээр ажиллуулна.
2. OBS нээнэ.
3. `Sources` хэсгээс `Browser Source` нэмнэ.
4. URL-д game-ийн local URL оруулна.
5. Width/height-ийг vertical болгоно, жишээ нь `450 x 800` эсвэл `1080 x 1920`.
6. Game-ийн browser source-ийг scene дотор байрлуулна.
7. YouTube Live эсвэл TikTok LIVE stream-ийн output болгон OBS-оос broadcast хийнэ.

## Interaction-ийн зорилго

Үзэгчийн action бүр game дээр event үүсгэнэ:

| Stream event      | Game action                                   |
| ----------------- | --------------------------------------------- |
| YouTube like      | 1 pickaxe унагана                             |
| YouTube subscribe | TNT унагана                                   |
| Super Chat        | Mega pickaxe эсвэл олон TNT унагана           |
| TikTok like       | 1 pickaxe унагана                             |
| TikTok follow     | TNT эсвэл pickaxe унагана                     |
| TikTok gift       | Gift-ийн үнээс хамаарч TNT/mega event үүсгэнэ |

Game доторх event mapping-ийн үндсэн санаа:

```ts
if (event.type === "like") spawn("pick", event.name);
if (event.type === "subscribe") spawn("tnt", event.name);
if (event.type === "superchat") spawn("mega", event.name);
```

## Жинхэнэ stream event холбох бүтэц

Одоогийн game-ийн `spawn()` функц нь demo timer-уудаас event авч байна. Жинхэнэ stream-д дараах бүтэц хэрэгтэй:

```text
YouTube Live / TikTok LIVE
				|
				v
Event bridge / connector
				|
				v
Next.js API endpoint эсвэл WebSocket server
				|
				v
Game client -> spawn("pick" | "tnt" | "mega")
```

### 1. Event bridge

Bridge нь YouTube/TikTok-ийн event-ийг game-ийн нэг стандарт format руу хувиргана:

```json
{
  "type": "like",
  "name": "viewer123",
  "amount": 1
}
```

Боломжит event type-үүд:

- `like`
- `subscribe`
- `follow`
- `gift`
- `superchat`

### 2. Game event format

Bridge-ийн event-ийг game action руу хөрвүүлнэ:

```ts
type StreamEvent = {
  type: "like" | "subscribe" | "follow" | "gift" | "superchat";
  name: string;
  amount?: number;
};
```

Жишээ mapping:

```ts
function mapEvent(event: StreamEvent) {
  if (event.type === "like") return { action: "pick", count: 1 };
  if (event.type === "subscribe") return { action: "tnt", count: 1 };
  if (event.type === "follow") return { action: "pick", count: 1 };
  if (event.type === "gift")
    return {
      action: event.amount && event.amount >= 10 ? "mega" : "tnt",
      count: 1,
    };
  if (event.type === "superchat") return { action: "mega", count: 1 };
  return null;
}
```

### 3. `/api/events` endpoint

Next.js API endpoint нь connector-оос event хүлээж авна. Endpoint нь:

- зөвхөн зөвшөөрөгдсөн secret-тэй request хүлээж авах;
- event-ийн type, name, amount-ийг шалгах;
- хэт олон event ирвэл rate limit хийх;
- browser client рүү WebSocket эсвэл Server-Sent Events ашиглан дамжуулах;
- secret болон OAuth token-ийг browser руу ил гаргахгүй байх;

Жишээ request:

```http
POST /api/events
Content-Type: application/json
Authorization: Bearer YOUR_BRIDGE_SECRET
```

```json
{
  "type": "subscribe",
  "name": "viewer123"
}
```

Game client рүү event дамжуулахдаа WebSocket ашиглавал live stream-д хамгийн хурдан, тогтвортой байна. Энгийн demo-д polling эсвэл Server-Sent Events ашиглаж болно.

## YouTube холболт

YouTube Live event авахын тулд:

1. Google Cloud project үүсгэнэ.
2. YouTube Data API v3-ийг идэвхжүүлнэ.
3. OAuth credentials тохируулна.
4. Live broadcast болон live chat-ийн мэдээллийг bridge уншина.
5. Like, subscribe, Super Chat-ийг стандарт event format руу хөрвүүлнэ.
6. `/api/events` endpoint рүү илгээнэ.

YouTube vertical live stream нь Shorts feed дээр харагдах боломжтой боловч Shorts-д гарах эсэхийг YouTube өөрөө шийддэг.

## TikTok холболт

TikTok LIVE event-үүдэд account болон API access-ийн хязгаарлалт байж болно. Албан ёсны access байхгүй үед TikTok LIVE connector эсвэл гуравдагч талын service ашиглаж болно.

TikTok event-үүдийг дээрх ижил format руу хөрвүүлнэ:

```json
{
  "type": "gift",
  "name": "viewer123",
  "amount": 25
}
```

## Environment variables

Secret болон OAuth утгуудыг кодонд шууд бичихгүй. `.env.local` файлд хадгална:

```env
BRIDGE_SECRET=change-this-secret
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REFRESH_TOKEN=your-refresh-token
```

`.env.local` файлыг git-д commit хийж болохгүй.

## Дараагийн хэрэгжүүлэх ажил

1. `/api/events` endpoint нэмэх.
2. WebSocket эсвэл Server-Sent Events channel нэмэх.
3. `spawn()` функцийг client event channel-тэй холбох.
4. YouTube bridge-ийг эхэлж холбох.
5. OBS дээр vertical Browser Source-оор турших.
6. TikTok connector нэмэх.
7. Rate limit, duplicate event filter, reconnect logic нэмэх.

## Анхаарах зүйл

- YouTube болон TikTok-ийн API credential-ийг frontend-д бүү оруул.
- Stream event маш олноор ирвэл нэг дор бүх pickaxe/TNT үүсгэхгүй, queue ашигла.
- Нэг event давхар ирэхээс хамгаалж event id хадгал.
- Production stream хийхээс өмнө OBS, audio, browser source, reconnect-ийг тусад нь турш.
