import { Navigate, createBrowserRouter } from 'react-router-dom';
import { InventoryPage } from './features/inventory/InventoryPage';
import { MealSuggestionsPage } from './features/meal-suggestions/MealSuggestionsPage';
import { AppLayout } from './layout/AppLayout';
import { MealsPage } from './features/meals/MealsPage';
import { MealPlannerPage } from './features/planner/MealPlannerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/planner" replace /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'meal-suggestions', element: <MealSuggestionsPage /> },
      { path: 'meals', element: <MealsPage /> },
      { path: 'planner', element: <MealPlannerPage /> }
    ]
  }
]);
