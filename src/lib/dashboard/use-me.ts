import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { meQuery } from "./data";

const authed = getRouteApi("/_authenticated");

/** The signed-in person (profile + roles). Only for screens under the dashboard gate. */
export function useMe() {
  const { user } = authed.useRouteContext();
  return useSuspenseQuery(meQuery(user.id)).data;
}
