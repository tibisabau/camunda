/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */

import { FC, useMemo, useCallback, useEffect, useState } from "react";
import { TabsVertical, Tab, TabPanels } from "@carbon/react";
import { useSearchParams } from "react-router-dom";
import useTranslate from "src/utility/localization";
import { usePaginatedApi } from "src/utility/api";
import Page, { PageHeader } from "src/components/layout/Page";
import {
  ResourceType,
  searchAuthorization,
} from "src/utility/api/authorizations";
import { TranslatedErrorInlineNotification } from "src/components/notifications/InlineNotification";
import {
  CustomTabListVertical,
  CustomTabPanel,
  TabsContainer,
  TabsTitle,
} from "./components";
import AuthorizationList from "./AuthorizationsList";
import { isTenantsApiEnabled } from "src/configuration";

const List: FC = () => {
  const { t } = useTranslate("authorizations");
  const [searchParams, setSearchParams] = useSearchParams();

  // Memoize authorizationTabs to enable effective useCallback memoization
  const authorizationTabs = useMemo(() => {
    const allResourceTypes = Object.values(ResourceType);
    if (!isTenantsApiEnabled) {
      return allResourceTypes.filter((type) => type !== ResourceType.TENANT);
    }
    return allResourceTypes;
  }, []);

  // Get the resource type from URL or use the first tab as default
  const getActiveTabFromUrl = useCallback(() => {
    const resourceTypeFromUrl = searchParams.get("resourceType");
    const isValidResourceType =
      resourceTypeFromUrl &&
      authorizationTabs.includes(resourceTypeFromUrl as ResourceType);
    return isValidResourceType
      ? (resourceTypeFromUrl as ResourceType)
      : authorizationTabs[0];
  }, [searchParams, authorizationTabs]);

  const [activeTab, setActiveTab] = useState<ResourceType>(
    getActiveTabFromUrl(),
  );

  // Sync activeTab state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = getActiveTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [getActiveTabFromUrl, activeTab]);

  const {
    data,
    loading,
    reload,
    success,
    resetPagination,
    ...paginationProps
  } = usePaginatedApi(searchAuthorization, {
    filter: { resourceType: activeTab },
  });

  const sortPermissionTypesAlphabetically = useCallback(
    (authorizationData: typeof data) => {
      return authorizationData
        ? {
            ...authorizationData,
            items: authorizationData.items?.map((item) => ({
              ...item,
              permissionTypes: [...item.permissionTypes].sort(),
            })),
          }
        : authorizationData;
    },
    [],
  );

  const transformedData = useMemo(
    () => sortPermissionTypesAlphabetically(data),
    [data, sortPermissionTypesAlphabetically],
  );

  // Ensure the URL always reflects the current active tab
  useEffect(() => {
    const resourceTypeFromUrl = searchParams.get("resourceType");
    if (resourceTypeFromUrl !== activeTab) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("resourceType", activeTab);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Reset pagination when activeTab changes (e.g., via browser back/forward or URL edits)
  useEffect(() => {
    resetPagination();
  }, [activeTab, resetPagination]);

  const handleTabChange = useCallback(
    (tab: { selectedIndex: number }) => {
      const newTab = authorizationTabs[tab.selectedIndex];
      setActiveTab(newTab);
    },
    [authorizationTabs],
  );

  return (
    <Page>
      <PageHeader
        title={t("authorizations")}
        linkText={t("authorizations").toLowerCase()}
        docsLinkPath="/docs/components/concepts/access-control/authorizations/"
      />
      <TabsTitle>{t("resourceType")}</TabsTitle>
      <TabsContainer>
        <TabsVertical
          selectedIndex={authorizationTabs.indexOf(activeTab)}
          onChange={handleTabChange}
        >
          <CustomTabListVertical aria-label={t("authorizationType")}>
            {authorizationTabs.map((tab) => (
              <Tab key={tab}>{t(tab)}</Tab>
            ))}
          </CustomTabListVertical>
          <TabPanels>
            {authorizationTabs.map((tab) => (
              <CustomTabPanel key={tab}>
                <AuthorizationList
                  tab={tab}
                  data={transformedData}
                  loading={loading}
                  reload={reload}
                  paginationProps={paginationProps}
                />
              </CustomTabPanel>
            ))}
          </TabPanels>
        </TabsVertical>
      </TabsContainer>
      {!loading && !success && (
        <TranslatedErrorInlineNotification
          title={t("authorizationLoadError")}
          actionButton={{ label: t("retry"), onClick: reload }}
        />
      )}
    </Page>
  );
};

export default List;
