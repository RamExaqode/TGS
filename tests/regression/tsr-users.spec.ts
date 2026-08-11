import { expect, test } from '../../fixtures/test-fixtures';
import { writeCsv } from '../../utils/csv';

test(
    'TSR Users page exports both user lists to CSV',
    {
        tag: ['@regression'],
    },
    async ({
        dashboardPage,
        navigationPage,
        tsrUsersPage,
    }) => {
        test.setTimeout(120000);

        await dashboardPage.navigate();

        await test.step(
            'Open TSR Users from the sidebar',
            async () => {
                await navigationPage.verifyItemClickable(
                    'TSR Users'
                );

                await navigationPage.open(
                    'TSR Users'
                );

                await navigationPage.verifyRoute(
                    'TSR Users'
                );

                await navigationPage.verifyPageTitle(
                    'TSR Users'
                );

                await tsrUsersPage.verifyLoaded();
            }
        );

        await test.step(
            'Export TSR Users',
            async () => {
                await tsrUsersPage.openTsrUsersTab();

                const users =
                    await tsrUsersPage.collectAllRows();

                await tsrUsersPage
                    .verifyRowCountMatchesTotal(users);

                for (const user of users) {
                    expect(
                        user.email,
                        `Row parsed with no email: ${user.name}`
                    ).toMatch(/@/);
                }

                const csvPath = writeCsv(
                    'tsr-users.csv',
                    ['Name', 'Role', 'Email'],
                    users.map((user) => [
                        user.name,
                        user.role,
                        user.email,
                    ])
                );

                await test.info().attach(
                    'tsr-users.json',
                    {
                        body: JSON.stringify(
                            users,
                            null,
                            2
                        ),
                        contentType:
                            'application/json',
                    }
                );

                console.log(
                    `TSR Users CSV: ${csvPath} ` +
                    `(${users.length} rows)`
                );
            }
        );

        await test.step(
            'Export Non-accepting users',
            async () => {
                await tsrUsersPage
                    .openNonAcceptingTab();

                const users =
                    await tsrUsersPage.collectAllRows();

                await tsrUsersPage
                    .verifyRowCountMatchesTotal(users);

                for (const user of users) {
                    expect(
                        user.email,
                        `Row parsed with no email: ${user.name}`
                    ).toMatch(/@/);
                }

                const csvPath = writeCsv(
                    'tsr-users-non-accepting.csv',
                    ['Name', 'Role', 'Email'],
                    users.map((user) => [
                        user.name,
                        user.role,
                        user.email,
                    ])
                );

                await test.info().attach(
                    'tsr-users-non-accepting.json',
                    {
                        body: JSON.stringify(
                            users,
                            null,
                            2
                        ),
                        contentType:
                            'application/json',
                    }
                );

                console.log(
                    `TSR Users / non-accepting CSV: ` +
                    `${csvPath} (${users.length} rows)`
                );
            }
        );
    }
);