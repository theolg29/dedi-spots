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
