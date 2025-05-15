require('dotenv').config();
const { connectDB, getDB, closeDB } = require('../connection');
const { ObjectId } = require('mongodb');
const Learning = require('../learnModel');

const defaultArticles = [
  {
    category: 'Money Basics',
    title: 'What Is Money and Why Do We Use It?',
    summary: 'Money is something we use every day, but have you ever wondered what it really is? ',
    content: `Money is something we use every day, but have you ever wondered what it really is? Money isn’t just paper bills or coins; it’s a tool we use to buy things we need or want, like toys, snacks, or games. Before money existed, people traded items like apples for bread or milk for eggs. This was called bartering, and it was how people got what they needed. But it wasn’t always fair or easy. That’s why money was created to make trading simple and equal.
Today, money comes in many forms: coins, bills, bank cards, and even digital money like gift cards or app points. We work to earn money and then use it to buy things, save for the future, or give to others. Money helps us make choices, and learning how it works helps us make smart choices!
But money is more than just something we use. It helps communities run, stores stay open, and people to trade goods and services all over the world. Imagine trying to buy something without it you’d have to find someone who wanted exactly what you had. That could take forever!
Money also teaches us value. For example, if you earn $5 for doing chores and want to buy a $10 toy, you quickly learn the meaning of value, saving, and effort. It helps you understand how hard people work to earn money, and why we need to respect what it can do.
As you grow, you’ll start using money for all kinds of things buying school supplies, saving for a trip, or even starting your own small business. And the better you understand how money works, the better your choices will be. So next time you hold a coin or tap a card, remember: that’s more than just money it’s your power to make decisions.
    `,
    reward: 0
  },
  {
    category: 'Smart Spending',
    title: 'Needs vs Wants: How to Tell the Difference',
    summary: 'Have you ever wanted the newest video game or a cool pair of shoes? That’s totally normal! But do you need them?',
    content: `Have you ever wanted the newest video game or a cool pair of shoes? That’s totally normal! But do you need them? Learning the difference between needs and wants helps us spend our money wisely.
Needs are things we must have to live, like food, water, clothes, and a place to live. Wants are extras things that are fun or nice to have but aren’t necessary. For example, a warm jacket in winter is a need. A designer jacket with your favourite logo is a want.
When you get money, think first: "Is this a need or a want?" Spending on needs comes first. Then, if you have money left, you can think about the wants. This way, you make smarter choices and avoid running out of money for things that really matter.
It’s also okay to enjoy the things you want! It’s about balance. A helpful way to think about this is the 50/30/20 rule: 50% of your money goes to needs, 30% to wants, and 20% to savings. This rule is usually for adults, but kids can learn from it too.
You can even make a list when you want to buy something. Label it as a need or want, and wait a few days. If you still want it, then maybe it’s worth it. But you might find that it wasn’t that important after all.
Being able to tell the difference between needs and wants will help you not only as a kid but also as a grown-up. It helps you make smart money decisions, build better habits, and save for things that really matter.
    `,
    reward: 0
  },
  {
    category: 'Saving Skills',
    title: 'The Power of Saving: Find Out Why It Pays to Wait',
    summary: 'Saving money is like planting a seed. You put it in the ground, take care of it, and over time, it grows into something amazing. ',
    content: `Saving money is like planting a seed. You put it in the ground, take care of it, and over time, it grows into something amazing. Saving means keeping some of your money instead of spending it right away. It helps you prepare for the future, reach your goals, and learn self-control.
Let’s say you get an allowance of five dollars every week. You really want a toy that costs twenty-five dollars. If you spend your money right away on smaller things like candy or stickers, it will take longer to save up for the toy. But if you save your five dollars every week, you’ll be able to buy that toy in just five weeks. That’s the power of saving.
It’s not always easy to save. Sometimes it feels like forever to wait for something you want. But when you do finally buy it, it feels even better. Why? Because you worked for it. You earned it. You made a smart decision. That’s something to be proud of.
Saving is also useful when surprises happen. Maybe your favorite headphones break, or your school bag gets torn. If you’ve been saving your money, you can replace these things without having to wait. Savings give you freedom and flexibility.
Another way to think about saving is using three jars or envelopes: one for spending, one for saving, and one for sharing. Every time you get money, you can split it between the jars. Maybe you put 50% in saving, 40% in spending, and 10% in sharing. That way, you’re always ready for something fun, something important, and something kind.
Some kids even open a bank savings account with help from their parents. These accounts can earn interest, which is a little extra money added by the bank just for keeping your savings there. It’s like a reward for being patient and responsible.
Think of saving as a superpower. It gives you control over your money instead of your money controlling you. It teaches you to think about your future and to choose long-term happiness over short-term fun. The more you practice saving now, the easier it will be as you grow up.
And remember, saving isn’t just about big goals. It can also help you enjoy holidays, birthday shopping, or helping a friend. It gives you choices. So the next time you’re about to spend all your money, stop and ask yourself: “What if I saved this for something bigger?” You might be surprised how good it feels.
    `,
    reward: 0
  },
  {
    category: 'Earning Basics',
    title: 'Earning Money: Through Chores, Jobs, and More',
    summary: 'Money doesn’t grow on trees. You earn it. That means doing something helpful or valuable, and in return, getting paid. ',
    content: `Money doesn’t grow on trees. You earn it. That means doing something helpful or valuable, and in return, getting paid. Kids can earn money in lots of fun and useful ways, and when you earn your own money, it means a lot more to you.
A common way for kids to earn money is by doing chores at home. This could be cleaning your room, washing dishes, taking out the trash, helping with laundry, or walking the dog. Some parents give money each week, which is called an allowance. Others may pay for extra chores beyond your regular responsibilities.
Outside the home, kids can help neighbors by raking leaves, shoveling snow, watering plants, or watching pets while someone’s away. These are all real jobs that help people and can earn you a few extra dollars.
If you have a talent or hobby, you can use that to make money too. Love making bracelets? Try selling them at school or a local market. Good at drawing or painting? Make custom cards or posters. Baking cookies, helping with tech, or setting up a lemonade stand are all ways to turn your skills into small businesses.
Earning money teaches you more than just how to make cash. It teaches you how to work hard, be dependable, and feel proud of what you do. When you work for your money, you think more carefully about spending it. It’s no longer just money someone gave you, it’s something you earned.
Talk with your family about ways you might earn money. Make a list of chores you could do or jobs you could offer in your neighborhood. Set goals for what you want to earn and how you’ll use the money. Maybe half goes into your savings jar, a little into your fun money jar, and a bit into your giving jar.
As you get older, you’ll find even more ways to earn money, like babysitting, tutoring, or working part-time. But learning how to earn money when you’re young helps build good habits early.
So whether you’re sweeping the floor, walking dogs, or starting a craft stand, remember this: you’re not just earning money, you’re earning skills, confidence, and independence. That’s something money can’t buy.`,
    reward: 0
  },
{
    category: 'Budgeting',
    title: 'Budgeting Basics: Making a Money Plan & Sticking to it',
    summary: 'Have you ever spent all your allowance on snacks and small toys and then realized you didn’t have enough for the thing you really wanted? That’s where budgeting comes in.',
    content: `Have you ever spent all your allowance on snacks and small toys and then realized you didn’t have enough for the thing you really wanted? That’s where budgeting comes in. A budget is a plan for your money. It helps you make sure you don’t spend everything at once, and it makes it easier to reach your goals.
Think of a budget like a roadmap. It shows you where your money is going and helps you figure out how to get to where you want to be. Just like a roadmap tells you which roads to take to get to your friend’s house, a budget tells you how much to save, how much to spend, and how to use your money wisely.
To start a budget, write down how much money you get. This could be from allowance, gifts, or money you earn from chores or a small job. That’s your income. Then, make a list of what you want to do with that money. Do you want to buy a toy, save up for a bike, or donate to a cause? These are your spending categories.
Now decide how much money goes into each category. For example, if you get ten dollars, you might put five dollars into savings, three dollars into spending, and two dollars into sharing. This helps you make sure you have money for the things that matter most to you.
There are different ways to track your budget. You can use a notebook, a chart on your wall, or even apps with help from your parents. The key is to keep it simple and make it a habit. Check in with your budget often to see how you’re doing. Did you overspend on snacks? Did you reach your savings goal? This helps you adjust and stay on track.
Budgeting also helps you understand the value of money. It teaches you to plan ahead, make choices, and be responsible. You’ll learn that sometimes you have to wait or say no to small things so you can say yes to something bigger later.
And don’t forget: budgets aren’t just for spending and saving. They’re also for dreaming. Want to go to an amusement park? Budget for it. Want to buy a gift for your sibling? Budget for that too. A good budget gives your money a purpose and puts you in charge.
One helpful tip is to review your budget at the end of each week. Look at what worked and what didn’t. If you spent too much on one thing, think about how you can do better next time. It’s okay to make mistakes. That’s how you learn.
As you grow older, your budget might get more detailed. You’ll have more categories and more money to manage. But the skills you build now—planning, tracking, and adjusting—will stay with you for life.
So next time you get money, don’t just spend it right away. Make a budget. Make a plan. And make your money work for you.`,
    reward: 0
  },

  {
    category: 'Generosity',
    title: 'Giving Back: Why Sharing Your Money Matters',
    summary: 'When you think of money, you probably think about what you can buy. But did you know that money can also be used to help others?',
    content: `When you think of money, you probably think about what you can buy. But did you know that money can also be used to help others? That’s called giving back, and it’s one of the best things you can do with your money.
Giving back means using part of your money to support people, animals, or causes you care about. It could be giving a few dollars to a charity, buying food for someone in need, or donating supplies to a local shelter. Even small amounts can make a big difference.
Why does giving back matter? Because it helps you build empathy. That means understanding how others feel and wanting to help them. When you give to others, you learn to think outside of yourself and see the world through someone else’s eyes.
It also feels really good. Helping someone else brings a sense of joy and purpose. It reminds you that you’re part of a bigger community and that you can make a positive impact.
You don’t need a lot of money to give back. You can set aside just a little each week. Try creating a giving jar or envelope. When you get money, add a small part to your giving fund. Over time, it will grow. Then, with your family, choose where you want that money to go.
Maybe you care about animals. You could donate to a pet rescue. Maybe you want to help other kids. You could buy school supplies or books for a classroom. The important thing is to find something that matters to you.
Giving also teaches you gratitude. That means being thankful for what you have. When you see that others might not have the same things, you appreciate your home, food, and clothes even more.
And remember, giving back isn’t always about money. You can also give your time, kindness, or talents. Volunteering at a food bank, helping a neighbor, or organizing a toy drive are all great ways to give back.
When you build the habit of giving now, it becomes a part of who you are. As you grow up, you’ll look for ways to support your community and make the world a better place.
So the next time you earn or receive money, think about setting some aside for someone else. Because giving isn’t just about helping others—it’s also about becoming a kind, thoughtful, and generous person.`,
    reward: 0
  },

    {
    category: 'Money Tools',
    title: 'Money Tools: How Banks and Piggy Banks Help You Save',
    summary: 'Saving money is important, but just as important is where you keep that money. That’s where piggy banks and real banks come in.',
    content: `Saving money is important, but just as important is where you keep that money. That’s where piggy banks and real banks come in. Both are tools that help you manage and protect your money. Let’s take a closer look at how each one works and why you might want to use them.
A piggy bank is often the first place kids start saving. It could be a plastic jar, a ceramic pig, or even a decorated tin can. The best part is that it’s simple and easy to use. You drop in your coins or bills, and over time, your savings grow. Piggy banks are great for setting short-term goals like saving for a toy, a book, or a fun day out.
But what if you want to save even more money or keep it safe in the long term? That’s when a real bank comes in handy. A bank is a place where people can store their money so it doesn’t get lost or stolen. When you put your money in a savings account at a bank, you can still get it when you need it, but it’s protected and organised.
Banks even reward you for saving. They do this by paying you a little extra money called interest. Interest is money the bank gives you just for keeping your money there. The more you save and the longer you leave it in your account, the more interest you can earn.
Opening a bank account is usually something you do with your parents or guardians. Some banks even offer special accounts just for kids. These accounts help you learn how to deposit and withdraw money, read bank statements, and track your savings goals.
Let’s compare: piggy banks are awesome for learning how to save. You get the fun of watching your money grow and practicing saving for things you can see. But they don’t give you interest, and if you lose the piggy bank or it breaks, your money could be gone. Banks are more secure, and they offer tools that help you learn even more about handling money.
You can even use both! Use a piggy bank at home to collect your coins. Then, when it gets full, take that money with your parents to the bank and deposit it. That way, you’re using your piggy bank to practice saving, and your real bank to grow your savings.
Another great thing about using a bank is learning how to use bank cards and online banking. With help from your family, you can learn how to check your balance, see where your money went, and set up savings goals. This helps you prepare for managing your money as a teen and adult.
So whether you use a piggy bank, a savings account, or both, remember: it’s not just about keeping your money safe. It’s about making smart choices, learning responsibility, and setting yourself up for a strong financial future.`,
    reward: 0
  },

  
    {
    category: 'Smart Choices',
    title: 'Making Smart Choices: What to Do Before You Spend',
    summary: 'It’s fun to spend money, but before you buy something, it’s important to stop and think. ',
    content: `It’s fun to spend money, but before you buy something, it’s important to stop and think. Smart spending means making choices that help you get the most out of your money. It helps you avoid wasting money on things you don’t really need or things you might regret later.
            Let’s say you walk into a store and see a cool toy. You have just enough money to buy it. But wait do you really want it? Will you still like it next week? Is there something else you’ve been saving up for?
            Asking yourself a few questions before spending can help you make smarter choices. Try this checklist:
            Do I need it or just want it?
            Will I use it more than once?
            Is it worth the money?
            Can I get it cheaper somewhere else?
            If I wait a few days, will I still want it?
            Thinking about these questions helps you feel more confident about your choices. It also helps you avoid impulse buying. That means buying something the moment you see it without thinking it through.
            One helpful tip is the “24-hour rule.” If you see something you want that costs more than a certain amount—like ten or twenty dollars—wait a full day before buying it. If you still want it after waiting, then it might be a good choice. If not, you just saved yourself from spending on something you didn’t really need.
            Another way to make smart choices is by comparing prices. If you’re shopping online or in stores, check a few different places to see where you can get the best deal. You can also read reviews or ask your friends if they’ve bought the same thing. This helps you know if it’s really worth it.
            You can also look at your budget. If you’ve set money aside for spending, check how much you have before buying anything. If the item costs more than what you planned to spend, maybe it’s better to wait or save up more.
            Smart spending also means thinking about the future. If you spend all your money now, you won’t have any left for something that might come up later—like a school trip or a birthday gift for a friend. Saving some of your money for later gives you more freedom and choices.
            And here’s something important: making a smart choice doesn’t always mean saying no. It just means thinking first. If something is fun, useful, and fits your budget, go for it! But if it’s something you might regret, take a step back.
            In the end, being smart with your money means being in control. You get to decide what matters to you. You get to make decisions that help you feel good, not just in the moment, but later too.
            So before you spend your next dollar, stop and ask: Is this the smartest choice I can make? If it is, great. If not, maybe saving is the better move. Either way, you’re learning and getting better with money every day.`,
    reward: 0
  },
];

async function seedLearningModules(specificUserId = null) {
  let isConnectedInternally = false;

  try {
    let db;
    try {
      db = getDB();
    } catch (error) {
      console.log('Database connection not initialized. Connecting now...');
      await connectDB();
      db = getDB();
      isConnectedInternally = true;
      console.log('Connected to database successfully');
    }

    let children = [];
    
    if (specificUserId) {      
      const userObjectId = typeof specificUserId === 'string' 
        ? new ObjectId(specificUserId) 
        : specificUserId;
      
      const user = await db.collection('users').findOne({ 
        _id: userObjectId,
        accountType: 'child'
      });
      
      if (!user) {
        return;
      }
      

      const existingCount = await db.collection('learnings').countDocuments({ 
        assigneeId: user._id 
      });
      
      
      if (existingCount > 0) {
        return;
      }
      
      children = [user];
    } else {
      
      const allChildren = await db.collection('users').find({
        accountType: 'child'
      }).toArray();
      
      
      if (allChildren.length === 0) {
        console.log('No child users found. Please create child accounts first.');
        return;
      }
      
      children = [];
      for (const child of allChildren) {
        const modulesCount = await db.collection('learnings').countDocuments({ 
          assigneeId: child._id 
        });
        
        if (modulesCount === 0) {
          children.push(child);
        }
      } 

      
      if (children.length === 0) {
        return;
      }
    }

    const parents = await db.collection('users').find({
      accountType: 'parent'
    }).toArray();

    let defaultPosterId;
    let familyId = null;
    
    if (children.length > 0 && children[0].familyId) {
      familyId = children[0].familyId;
      
      const familyParent = await db.collection('users').findOne({
        familyId: familyId,
        accountType: 'parent'
      });
      
      if (familyParent) {
        defaultPosterId = familyParent._id;
      } else if (parents.length > 0) {
        defaultPosterId = parents[0]._id;
      } else {
        defaultPosterId = new ObjectId();
      }
    } else {
      defaultPosterId = parents.length > 0 ? parents[0]._id : new ObjectId();
      familyId = null;
    }

    let articlesCreated = 0;

    for (const child of children) {
      
      for (const article of defaultArticles) {
        
        const childArticle = {
          ...article,
          posterId: defaultPosterId,
          familyId: child.familyId || familyId,
          assigneeId: child._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          userProgress: [{
            userId: child._id,
            status: 'new',
            reflection: '',
            lastAccessedAt: new Date(),
            completedAt: null
          }]
        };

        try {
          const result = await db.collection('learnings').insertOne(childArticle);
          articlesCreated++;
        } catch (error) {
          console.error(`Error creating article "${article.title}" for child ${child._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (isConnectedInternally) {
      await closeDB();
      
      if (require.main === module) {
        console.log('Exiting process...');
        process.exit(0);
      }
    }
  }
}

if (require.main === module) {
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
    process.exit(1);
  });

  const args = process.argv.slice(2);
  const specificUserId = args[0]; 
  
  connectDB()
    .then(() => {
      if (specificUserId) {
        console.log(`Running seed for specific user ID: ${specificUserId}`);
        return seedLearningModules(specificUserId);
      } else {
        console.log('Running seed for all users without learning modules');
        return seedLearningModules();
      }
    })
    .catch(error => {
      console.error('Fatal error during seeding:', error);
      process.exit(1);
    });
} else {
  module.exports = seedLearningModules;
}