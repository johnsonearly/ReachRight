import { normalizeScored } from "../src/lib/scores";
import type { BusinessProfile, BusinessType, Channel, ChannelOption, CustomerType, GeneratedContent } from "../src/types";
import { eventCandidates, MAX_CHANNELS, toChannelOption } from "./candidates";
import type { ContentTarget } from "./prompts";

interface MockCustomerType extends Omit<CustomerType, "id"> {
  /** Extra words used to match sample events. */
  keywords: string[];
  /** Hand-written online channel scores for this customer type. */
  online: Partial<Record<Channel, [number, string]>>;
}

const MOCK: Record<BusinessType, MockCustomerType[]> = {
  coffee_shop: [
    {
      name: "Campus crammers",
      ageRange: "18-24",
      description: "Students who need an affordable, calm spot to study between classes.",
      fitScore: 86,
      reason: "You're close to Dal and SMU, with Wi-Fi, outlets and long tables.",
      keywords: ["students", "study", "coffee", "campus", "budget"],
      online: {
        instagram: [80, "Students find new cafes through friends' posts and Stories."],
        tiktok: [68, "Short 'study spot' videos travel well among students."],
        facebook: [30, "Fewer students follow local shops here."],
      },
    },
    {
      name: "Remote workers",
      ageRange: "26-40",
      description: "Tech and creative workers who want good espresso and a reliable place to work.",
      fitScore: 72,
      reason: "Free Wi-Fi, outlets and all-day hours suit a working day away from home.",
      keywords: ["remote work", "tech", "coffee", "professionals"],
      online: {
        linkedin: [70, "Local tech and startup workers are active on LinkedIn."],
        instagram: [64, "Good for showing the space, seating and outlets."],
        email: [40, "Works once regulars have joined a list."],
      },
    },
    {
      name: "Weekend regulars",
      ageRange: "35-65",
      description: "Locals who enjoy fresh baking, local food and a weekend coffee routine.",
      fitScore: 61,
      reason: "In-house scones and a local roaster appeal to people who shop local.",
      keywords: ["local", "food", "market", "community", "weekend", "families"],
      online: {
        facebook: [74, "This group follows local businesses and community groups on Facebook."],
        email: [55, "A short monthly note keeps regulars in the loop."],
        instagram: [45, "Some use it, but less often than Facebook."],
      },
    },
  ],
  bookstore: [
    {
      name: "Book club readers",
      ageRange: "30-60",
      description: "Keen readers who like thoughtful picks, local authors and book clubs.",
      fitScore: 84,
      reason: "An independent shop can offer the personal recommendations they look for.",
      keywords: ["books", "reading", "literature", "writers", "community"],
      online: {
        email: [76, "Readers welcome a short monthly picks newsletter."],
        facebook: [66, "Many book clubs organise through Facebook groups."],
        instagram: [48, "Shelf photos reach some readers."],
      },
    },
    {
      name: "Fantasy and comics fans",
      ageRange: "16-30",
      description: "Fans hunting for new series, comics and special editions.",
      fitScore: 70,
      reason: "Genre fans like a shop that knows the shelves and stocks new series.",
      keywords: ["books", "comics", "gaming", "fandom", "students"],
      online: {
        tiktok: [78, "BookTok drives a lot of genre discovery for this age group."],
        instagram: [66, "New-arrival and shelf photos perform well."],
        email: [30, "Lower interest in newsletters at this age."],
      },
    },
    {
      name: "Students on a budget",
      ageRange: "18-24",
      description: "Students looking for affordable used books and course readings.",
      fitScore: 58,
      reason: "Used copies and a central location suit tight student budgets.",
      keywords: ["students", "study", "books", "budget", "campus"],
      online: {
        instagram: [70, "Students follow local shops they visit with friends."],
        tiktok: [60, "Quick shelf-tour videos reach students cheaply."],
        facebook: [28, "Few students follow shops on Facebook."],
      },
    },
  ],
  clothing_boutique: [
    {
      name: "Sustainable style seekers",
      ageRange: "22-35",
      description: "Shoppers who love vintage, local designers and buying fewer, better pieces.",
      fitScore: 83,
      reason: "A small boutique fits people who avoid fast fashion.",
      keywords: ["fashion", "vintage", "sustainability", "style", "design"],
      online: {
        instagram: [82, "Outfit photos and new arrivals drive boutique visits."],
        tiktok: [64, "Try-on videos reach this group well."],
        email: [35, "Useful later, once you have a list."],
      },
    },
    {
      name: "Young professionals",
      ageRange: "26-40",
      description: "Office workers wanting polished, versatile pieces without a mall trip.",
      fitScore: 68,
      reason: "Downtown workers can shop at lunch or after work.",
      keywords: ["professionals", "style", "shopping", "fashion"],
      online: {
        instagram: [72, "A visual platform suited to styling ideas."],
        linkedin: [42, "Workwear content can reach some local professionals."],
        email: [40, "Seasonal edits by email are easy to act on."],
      },
    },
    {
      name: "Gift-buying partners and parents",
      ageRange: "35-60",
      description: "People buying a thoughtful gift who value friendly advice in store.",
      fitScore: 55,
      reason: "Gift buyers like personal help choosing the right piece.",
      keywords: ["gifts", "holiday", "shopping", "families", "local"],
      online: {
        facebook: [70, "This group follows local shops on Facebook."],
        email: [56, "A seasonal gift guide by email is easy to act on."],
        instagram: [44, "Some browse gift ideas here."],
      },
    },
  ],
  gift_shop: [
    {
      name: "Holiday gift hunters",
      ageRange: "30-60",
      description: "Shoppers who want unique, locally made gifts instead of mall items.",
      fitScore: 85,
      reason: "Locally made goods are exactly what they're looking for.",
      keywords: ["gifts", "holiday", "crafts", "local", "makers"],
      online: {
        facebook: [72, "Local community groups share holiday gift finds."],
        instagram: [66, "Product photos help people choose before visiting."],
        email: [50, "A holiday gift guide by email is easy to act on."],
      },
    },
    {
      name: "Visitors and cruise passengers",
      ageRange: "40-70",
      description: "Tourists looking for a made-in-Nova-Scotia keepsake to take home.",
      fitScore: 66,
      reason: "Visitors want a meaningful local souvenir.",
      keywords: ["tourists", "outdoors", "local", "artisan"],
      online: {
        instagram: [62, "Visitors search location tags while planning a day out."],
        facebook: [52, "Older visitors check pages for hours and location."],
        tiktok: [30, "Less used by this age group."],
      },
    },
    {
      name: "Design-loving locals",
      ageRange: "25-40",
      description: "Locals who enjoy discovering new makers and small design pieces.",
      fitScore: 60,
      reason: "New local makers give them a reason to keep coming back.",
      keywords: ["design", "makers", "artisan", "crafts", "art"],
      online: {
        instagram: [78, "Makers and design fans follow each other on Instagram."],
        email: [46, "A 'new makers this month' note keeps them coming back."],
        tiktok: [40, "Maker videos can work but take more effort."],
      },
    },
  ],
  other: [
    {
      name: "Neighbourhood regulars",
      ageRange: "30-65",
      description: "Locals who value convenience and like supporting shops nearby.",
      fitScore: 74,
      reason: "People nearby are the easiest customers for a small shop to win.",
      keywords: ["local", "community", "market", "families"],
      online: {
        facebook: [72, "Neighbourhood groups on Facebook are active in Halifax."],
        email: [50, "A simple update email reaches existing customers."],
        instagram: [44, "Some locals follow nearby shops here."],
      },
    },
    {
      name: "Students and young adults",
      ageRange: "18-28",
      description: "Students open to trying new local spots their friends recommend.",
      fitScore: 57,
      reason: "Students try new places often, especially on a recommendation.",
      keywords: ["students", "budget", "young adults", "nightlife"],
      online: {
        instagram: [74, "Students discover places through friends' posts."],
        tiktok: [62, "Short videos reach younger people cheaply."],
        facebook: [25, "Few students follow shops on Facebook."],
      },
    },
  ],
};

function mockTypes(business: BusinessProfile): (MockCustomerType & { id: string })[] {
  return MOCK[business.type].map((t, i) => ({ ...t, id: `${business.type}-${i + 1}` }));
}

export function mockCustomerTypes(business: BusinessProfile): CustomerType[] {
  return normalizeScored(
    mockTypes(business).map(({ id, name, ageRange, description, fitScore, reason }) => ({
      id,
      name,
      ageRange,
      description,
      fitScore,
      reason,
    })),
  );
}

/** Online scores come from the canned table; event scores come from the tag-matching logic. */
export function mockChannels(business: BusinessProfile, customer: CustomerType): ChannelOption[] {
  const mock = mockTypes(business).find((t) => t.id === customer.id);
  const online = Object.entries(mock?.online ?? {}).flatMap(([id, [score, reason]]) => {
    const option = toChannelOption(id, score, reason);
    return option ? [option] : [];
  });
  const matchCustomer = { ...customer, keywords: mock?.keywords };
  const events = eventCandidates(business, [matchCustomer])
    .slice(0, 3)
    .flatMap((m) => {
      const option = toChannelOption(m.event.id, m.score, m.reason);
      return option ? [option] : [];
    });
  return normalizeScored([...online, ...events], MAX_CHANNELS);
}

function tagify(words: string): string {
  return (
    "#" +
    words
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")
  );
}

export function mockContent(business: BusinessProfile, customer: CustomerType, target: ContentTarget): GeneratedContent {
  const who = customer.description.replace(/\.$/, "").toLowerCase();
  const hashtags = [tagify(`${business.neighbourhood} Halifax`), tagify(business.name)];

  if (target.kind === "event") {
    const eventName = target.event.name;
    return {
      body: `Find ${business.name} at ${eventName}! We're bringing a taste of our ${business.neighbourhood} shop. If you're one of the ${who}, come say hi and see what we're about. [Add your stall number]`,
      hashtags,
      imageBrief: `The ${business.name} team at their stall at ${eventName}, with a hand-lettered sign and a few signature items on the table. Natural daylight, relaxed and welcoming.`,
    };
  }

  switch (target.channel) {
    case "email":
      return {
        subjectLine: `A little news from ${business.name}`,
        body: `Hi there,\n\nA quick hello from ${business.name} in ${business.neighbourhood}. ${business.description}\n\nWe had ${who} in mind when we set things up, so we think you'll feel at home here.\n\nWe'd love to see you soon.\n\nThanks for supporting a local shop,\nThe ${business.name} team`,
        hashtags: [],
        imageBrief: `A warm, slightly overhead photo of the counter at ${business.name}, one signature item in focus and the street visible through the window.`,
      };
    case "linkedin":
      return {
        body: `Running a small business in ${business.neighbourhood} means getting to know the people who walk through our door. Lately that's often ${who}.\n\nIf that sounds like you, ${business.name} is here. ${business.description}`,
        hashtags: [tagify("Halifax business"), tagify("shop local")],
        imageBrief: `A candid shot of someone working at a table inside ${business.name}, soft window light, shop details in the background.`,
      };
    case "tiktok":
      return {
        body: `POV: you just found your new ${business.neighbourhood} spot.\nMade for ${who}. Come see ${business.name} for yourself.`,
        hashtags,
        imageBrief: `A 10-second vertical walk-through from the door of ${business.name} to a close-up of a signature item. Natural, filmed on a phone.`,
      };
    case "facebook":
      return {
        body: `Hello neighbours! ${business.name} is your local spot in ${business.neighbourhood}. ${business.description}\n\nIf you're one of the ${who}, drop by and say hello.`,
        hashtags,
        imageBrief: `A bright daytime photo of the ${business.name} shop front with the door open and a chalkboard sign outside.`,
      };
    case "instagram":
      return {
        body: `Your new favourite corner of ${business.neighbourhood}.\n\n${business.description}\n\nMade for ${who}. Come by and see for yourself.`,
        hashtags,
        imageBrief: `A close-up, natural-light photo of a signature item at ${business.name} on a wooden counter, the interior softly blurred behind it.`,
      };
  }
}
