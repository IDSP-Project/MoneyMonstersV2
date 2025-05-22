# **Money Monsters Budget Planning Web App**

## **Project Overview**

Our aim with this project was to create an app that helps parents teach children about the value of money and how to manage a budget. We designed the platform to allow parents to assign household chores as tasks, with a monetary reward offered for completing them. Children can then set "goals," which are targets they wish to save towards. We wanted to encourage children to contribute to household responsibilities while also teaching them vital money management skills. We also included a learning section where kids can read blogs on money management. Parents have the option to assign specific blogs for their children's attention, and they may also choose to offer a monetary reward for completing them.

## **Design Variations & Rationale**

During our development process, we made several important design decisions to enhance functionality and improve user experience. Here's why we chose to modify certain aspects of the original design:

### **Features Developers Chose Not to Implement**

#### Notifications Page  
This feature was omitted, as we had been tasked with building a web application (rather than a mobile app). Without native push notification capabilities, a dedicated notifications page felt out of place in our web-based context.

#### Light/Dark Mode Toggle  
Due to the lack of specific design specifications (to differtiate both modes), this feature was disregarded. While we'd like to add this in the future, we prioritized core functionality within our 4 week project timeline.

#### Settings Page in User Profile  
Everything originally planned for this section was already accessible elsewhere in the platform, making a dedicated settings page feel unnecessary.

### **Features Developers Modified or Enhanced**

#### User Overview Page  
The single user settings page was replaced with a comprehensive Family Overview Page. We felt that this was particularly important for parent users, who required increased family management capabilities. This change addressed: 

1. Orphaned Account Prevention: By including an  "add by email" feature, parents are able to connect with children's accounts that already exist  
2. Easy Family Invitation: Our referral link generation system allows for seamless and immediate family member registration  
3. Self-Service Management: This page provided parents with the ability to remove family members, and to update their household name independently. This improved the user experience, but allowing users to complete these tasks autonomously, without requiring technical support.

#### View As Child Interface  
To improve usability and maintain clear context for parents managing multiple accounts, we:

1. Created an immediate post-login prompt for parents that allows them to clearly select which family member's information they would like to view. If "continue as self" is selected, parents enter a view-only mode with access to a comprehensive household summary.  
2. Added persistent "Viewing as" indicators across dashboard, goals, and tasks pages. This solved the critical issue in the original design where blank or similar profile photos made it difficult to identify whose information was being displayed. Our updated interface clearly shows which family member is currently selected at all times.

These enhancements significantly reduce confusion when navigating between family members and provide constant visual confirmation of the current context, ensuring parents always know exactly whose information they're viewing or modifying.

#### Goal-Task Association  
We enhanced the original design by adding task assignment buttons to goals. This ensures the goal progress history accurately reflects completed tasks, creating a more meaningful connection between work and rewards.

Similarly, we also added the option to assign a balance to a specific goal. We noticed that if a task's reward was higher than the outstanding balance of the goal it was assigned to, then upon completion, any extra funds were sacrificed once the goal reached 100%. Instead, we allocated additional funds to the user's overall balance, and allowed children to allocate these balances to other goals accordingly.

#### Responsive Design Approach  
Since we weren't provided desktop designs, we implemented a mobile-first approach. This included a responsive container background that maintained the intended mobile experience on larger screens.

### **Design Implementation Challenges**

#### Form Validation Modals:  
Unfortunately, the confirm signup popups were added to designs after form completion, and developers were unable to implement the additional functionality within the timeframe. These late design changes created a challenge for our implementation schedule that wasn't anticipated in our original planning.

#### Radio Button Styling:  
Similarly, design changes to radio buttons occurred post-implementation, requiring layout adjustments that were not accounted for in the original project timeline. While we adapted to accommodate these changes, they impacted our ability to deliver other planned features.

## What We Learned

Building Money Monsters taught us valuable lessons about working on collaborative projects:

#### Communication is important:  
We found that early and continuous communication between designers and developers created a smoother development process. When design changes came late in the process, it created implementation challenges developers couldn't easily address.

#### User context is critical:  
Adding the "Viewing as" indicators across all pages of the application improved the overall user experience significantly. This highlights the importance of minor details to reduce confusion and improve the functionality of the platform.

## Pre-Launch Improvements

Before making this product publicly available, we'd like to continue to address several concerns:
#### Security enhancements:
Our current user identification system could be more robust. We would like to implement a more privacy-focused approach, using non-sequential identifiers instead of direct database IDs.  
#### Component architecture:
Refactoring our interface elements into more reusable components, would make our codebase more maintainable and consistent.
#### SVG handling:
Methods for managing icons and graphics could be improved, to ensure better performance and security. 
#### Error handling:
A more comprehensive system for handling errors would be helpful to provide users with feedback when things don't work as expected.  
#### Database optimization:
We'd review our data access patterns to ensure the application remains responsive as family accounts grow.

## Future Vision

Looking beyond launch, we see exciting opportunities to expand Money Monsters in the future:

#### Enhanced Options to Claim Goals

* Replace our parent approval system with actual Amazon purchase integration. This would allow parents to actually order the products via one click on the platform.  
* Add automatic money transfer options to allow parents to "pay out" earned balances.

#### Platform Growth

* Would like to expand the design to create optimized experiences for both tablets and desktops

#### Expanded Features

* Implement milestone tracking and progress analytics for goals  
* Increase personalization options, such as animated characters and congratulatory messages

### Technical Foundation  
Money Monsters is built on a simple stack: Node.js with Express for the backend, MongoDB for data storage, and EJS templates for server-side rendering. We use custom session-based authentication with bcrypt for security.

## Final Thoughts

Building Money Monsters has been an incredible educational journey for our team. As students tackling our first significant group project, we've grown tremendously through this experience. Each of us has learned valuable lessons, both in relation to real-world software development processes and working as a team.

Throughout this term, we learned to communicate effectively, divide responsibilities, and support each other through challenges. When we encountered unexpected challenges mid-development, we had to adapt quickly and reprioritize features following the Agile methodology.

The process of transforming our initial concept into a functioning application required us to manage our time carefully, set realistic milestones, and hold each other accountable. Seeing our codebase grow and evolve through collaborative effort was incredibly rewarding, especially when we overcame technical hurdles together.

We're proud of what we've accomplished within our deadline constraints. Beyond the application itself, we're taking away invaluable experience in project coordination, version control workflow, and responding constructively to feedback. These team skills will serve us well regardless of what technologies we work with in the future.

