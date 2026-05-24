import { mutation } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function createUser(
  ctx: MutationCtx,
  data: { name: string; email: string; image: string }
): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", data.email))
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("users", data);
}


export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existingSpots = await ctx.db.query("spots").take(1);
    if (existingSpots.length > 0) return { message: "Already seeded" };

    const marie = await createUser(ctx, {
      name: "Marie Dupont",
      email: "marie@spots.app",
      image: "https://i.pravatar.cc/150?img=47",
    });

    const lucas = await createUser(ctx, {
      name: "Lucas Bernard",
      email: "lucas@spots.app",
      image: "https://i.pravatar.cc/150?img=12",
    });

    const emma = await createUser(ctx, {
      name: "Emma Leclerc",
      email: "emma@spots.app",
      image: "https://i.pravatar.cc/150?img=32",
    });

    const spot1 = await ctx.db.insert("spots", {
      creatorId: marie,
      title: "Belvédère du Cap Roux",
      description:
        "Un panorama époustouflant sur les calanques et la mer turquoise. Accessible après 45 min de randonnée depuis Agay, la récompense est absolument à la hauteur. Le coucher de soleil depuis ce promontoire est l'un des plus beaux de la Côte d'Azur — les tons orangés sur la mer rouge et les îles d'or au loin créent un tableau inoubliable.",
      latitude: 43.426,
      longitude: 6.882,
      photos: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80",
      ],
      tags: ["#CoucherDeSoleil", "#Randonnée", "#VueMer", "#Panorama"],
      createdAt: Date.now() - 3 * 86400000,
    });

    const spot2 = await ctx.db.insert("spots", {
      creatorId: lucas,
      title: "Crique de l'Ouille",
      description:
        "Une crique secrète accessible uniquement à pied (20 min depuis le parking de la plage d'Argent) ou en kayak. L'eau y est d'un bleu cristallin, parfaite pour le snorkeling. Entourée de pins maritimes, elle reste à l'abri du vent et du monde même en plein été.",
      latitude: 43.002,
      longitude: 6.211,
      photos: [
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&q=80",
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
      ],
      tags: ["#Plage", "#Calme", "#Snorkeling", "#CriqueSecrète"],
      createdAt: Date.now() - 7 * 86400000,
    });

    const spot3 = await ctx.db.insert("spots", {
      creatorId: emma,
      title: "Lac du Verdon, Anse Cachée",
      description:
        "Une petite anse isolée sur les rives du lac de Sainte-Croix au Verdon. Accessible par un chemin escarpé de 10 min depuis la route des gorges. L'eau turquoise du lac, encadrée par les falaises blanchies du calcaire et les forêts de chênes, offre un cadre de baignade hors du commun.",
      latitude: 43.767,
      longitude: 6.109,
      photos: [
        "https://images.unsplash.com/photo-1564419431702-b8a91b67fe23?w=900&q=80",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&q=80",
      ],
      tags: ["#Lac", "#Verdon", "#Baignade", "#NatureSauvage"],
      createdAt: Date.now() - 14 * 86400000,
    });

    // Reviews for spot 1
    await ctx.db.insert("reviews", {
      spotId: spot1,
      userId: lucas,
      rating: 5,
      comment: "Le coucher de soleil était absolument magique. Un lieu que je recommande les yeux fermés !",
      createdAt: Date.now() - 2 * 86400000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot1,
      userId: emma,
      rating: 4,
      comment: "Vue imprenable, la montée vaut vraiment l'effort. Prévoir de l'eau et une bonne paire de chaussures.",
      createdAt: Date.now() - 1 * 86400000,
    });

    // Reviews for spot 2
    await ctx.db.insert("reviews", {
      spotId: spot2,
      userId: marie,
      rating: 5,
      comment: "Eau incroyablement claire, poissons visibles sans masque. L'endroit idéal pour décompresser.",
      createdAt: Date.now() - 5 * 86400000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot2,
      userId: emma,
      rating: 5,
      comment: "Un joyau caché. Peu de monde même en août. À garder secret !",
      createdAt: Date.now() - 3 * 86400000,
    });

    // Reviews for spot 3
    await ctx.db.insert("reviews", {
      spotId: spot3,
      userId: lucas,
      rating: 4,
      comment: "La couleur de l'eau du Verdon est irréelle. Le chemin est un peu glissant par endroits.",
      createdAt: Date.now() - 10 * 86400000,
    });

    return { message: "Seeded! 3 spots, 5 reviews." };
  },
});

export const addToulonSpot = mutation({
  args: {},
  handler: async (ctx) => {
    const marie = await createUser(ctx, {
      name: "Marie Dupont",
      email: "marie@spots.app",
      image: "https://i.pravatar.cc/150?img=47",
    });
    const lucas = await createUser(ctx, {
      name: "Lucas Bernard",
      email: "lucas@spots.app",
      image: "https://i.pravatar.cc/150?img=12",
    });
    const emma = await createUser(ctx, {
      name: "Emma Leclerc",
      email: "emma@spots.app",
      image: "https://i.pravatar.cc/150?img=32",
    });
    const theo = await createUser(ctx, {
      name: "Théo Martin",
      email: "theo@spots.app",
      image: "https://i.pravatar.cc/150?img=8",
    });
    const sofia = await createUser(ctx, {
      name: "Sofia Ramos",
      email: "sofia@spots.app",
      image: "https://i.pravatar.cc/150?img=25",
    });

    const spot = await ctx.db.insert("spots", {
      creatorId: marie,
      title: "Calanque de l'Eoube, Toulon",
      description:
        "Une calanque confidentielle nichée entre les caps Sicié et Cépet, à l'écart des foules de la rade de Toulon. L'eau y est d'un turquoise profond, protégée par des falaises calcaires qui tombent directement dans la mer. Accessible uniquement à pied depuis le sentier du littoral (30 min depuis Le Brusc), ou en bateau. La lumière en fin d'après-midi illumine les falaises d'un orange doré absolument unique. Idéal pour le snorkeling — des mérous et des sars se baladent à quelques mètres du bord.",
      latitude: 43.0731,
      longitude: 5.8820,
      photos: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80",
        "https://images.unsplash.com/photo-1533760881669-80db4d7b341d?w=900&q=80",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=80",
        "https://images.unsplash.com/photo-1504248888188-31a1a0d673e8?w=900&q=80",
      ],
      tags: ["#Calanque", "#Snorkeling", "#VueMer", "#CoucherDeSoleil", "#Randonnée"],
      createdAt: Date.now() - 2 * 86400000,
    });

    await ctx.db.insert("reviews", {
      spotId: spot,
      userId: lucas,
      rating: 5,
      comment: "L'endroit le plus beau que j'aie vu sur la côte varoise. L'eau est incroyablement claire, on voit le fond à 5 mètres. À faire absolument en fin de journée.",
      createdAt: Date.now() - 1 * 86400000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot,
      userId: emma,
      rating: 5,
      comment: "Coup de cœur total. La marche pour y accéder est légère et le paysage récompense largement l'effort. Prévoir un pique-nique, on a envie de ne jamais repartir.",
      createdAt: Date.now() - 18 * 3600000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot,
      userId: theo,
      rating: 4,
      comment: "Superbe calanque, peu connue même des Toulonnais. Quelques oursins à éviter près des rochers. Masque de snorkeling indispensable.",
      createdAt: Date.now() - 12 * 3600000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot,
      userId: sofia,
      rating: 5,
      comment: "On y est allés en kayak depuis le Brusc, vue imprenable depuis la mer. Les falaises orangées au soleil couchant, je n'oublierai jamais.",
      createdAt: Date.now() - 6 * 3600000,
    });
    await ctx.db.insert("reviews", {
      spotId: spot,
      userId: marie,
      rating: 4,
      comment: "Très belle calanque mais le sentier peut être un peu glissant après la pluie. Eau turquoise parfaite pour se baigner.",
      createdAt: Date.now() - 2 * 3600000,
    });

    return { message: "Toulon spot added with 5 reviews." };
  },
});
